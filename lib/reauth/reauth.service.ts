import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma/prisma.client";
import { verifyPassword } from "@/lib/password/password.service";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp/totp.service";
import { createWebAuthnAuthenticationOptions, verifyWebAuthnAuthentication } from "@/lib/webauthn/webauthn.service";
import {
  PENDING_SENSITIVE_ACTION_COOKIE,
  VERIFIED_SENSITIVE_ACTION_COOKIE,
  getVerifiedSensitiveActionTtlSeconds,
  isSensitiveActionPurpose,
  parsePendingSensitiveAction,
  serializePendingSensitiveAction,
  serializeVerifiedSensitiveAction,
} from "@/lib/security/sensitive-action.service";
import {
  checkReauthRateLimit,
  clearReauthFailures,
  recordReauthFailure,
} from "@/lib/rate-limit/rate-limit.service";
import { auditAction } from "@/lib/audit/audit.service";
import type { RequestMeta } from "@/lib/api/request";
import { badRequest, forbidden, ok, tooManyRequests, unauthorized } from "@/lib/api/api.response";
import { isValidTotpCode, toCleanString } from "@/lib/validation/validation.service";

export async function startSensitiveReauth(params: {
  userId: string;
  body: unknown;
  meta: RequestMeta;
}) {
  const body = params.body as Record<string, unknown> | null;
  const password = String(body?.password ?? "");
  const totp = toCleanString(body?.totp);
  const purpose = toCleanString(body?.purpose);

  if (!isSensitiveActionPurpose(purpose)) {
    return badRequest("Invalid re-auth purpose");
  }

  const rateLimit = await checkReauthRateLimit({
    ipAddress: params.meta.ipAddress,
    userId: params.userId,
    purpose,
  });

  if (rateLimit.blocked) {
    await auditAction({
      actorUserId: params.userId,
      action: "SENSITIVE_REAUTH_RATE_LIMITED",
      targetType: "AdminUser",
      targetId: params.userId,
      meta: params.meta,
    });

    return tooManyRequests(
      `Too many verification attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`
    );
  }

  const dbUser = await prisma.adminUser.findUnique({
    where: { id: params.userId },
    include: {
      totp: true,
      webauthnCredentials: true,
    },
  });

  if (!dbUser || !dbUser.isActive) {
    await recordReauthFailure({
      ipAddress: params.meta.ipAddress,
      userId: params.userId,
      purpose,
    });

    return unauthorized();
  }

  const passwordOk = await verifyPassword(password, dbUser.passwordHash);

  if (!passwordOk) {
    await recordReauthFailure({
      ipAddress: params.meta.ipAddress,
      userId: dbUser.id,
      purpose,
    });

    await auditAction({
      actorUserId: dbUser.id,
      action: "SENSITIVE_REAUTH_FAILED",
      targetType: "AdminUser",
      targetId: dbUser.id,
      meta: params.meta,
    });

    return unauthorized("Invalid password");
  }

  const isTotpEnabled = Boolean(dbUser.totp?.isEnabled);

  if (!isTotpEnabled && purpose !== "totp_management") {
    await recordReauthFailure({
      ipAddress: params.meta.ipAddress,
      userId: dbUser.id,
      purpose,
    });

    return forbidden("TOTP must be enabled before managing this section");
  }

  if (isTotpEnabled) {
    if (!isValidTotpCode(totp)) {
      await recordReauthFailure({
        ipAddress: params.meta.ipAddress,
        userId: dbUser.id,
        purpose,
      });

      return unauthorized("Valid TOTP code is required");
    }

    const secretBase32 = decryptTotpSecret(dbUser.totp!.secretEncrypted);

    const totpOk = verifyTotpCode({
      secretBase32,
      token: totp,
      accountName: dbUser.email,
    });

    if (!totpOk) {
      await recordReauthFailure({
        ipAddress: params.meta.ipAddress,
        userId: dbUser.id,
        purpose,
      });

      await auditAction({
        actorUserId: dbUser.id,
        action: "SENSITIVE_REAUTH_FAILED",
        targetType: "AdminUser",
        targetId: dbUser.id,
        meta: params.meta,
      });

      return unauthorized("Invalid TOTP code");
    }
  }

  if (dbUser.webauthnCredentials.length === 0) {
    await recordReauthFailure({
      ipAddress: params.meta.ipAddress,
      userId: dbUser.id,
      purpose,
    });

    return badRequest("No registered security keys found");
  }

  const options = await createWebAuthnAuthenticationOptions({
    userId: dbUser.id,
  });

  const res = ok({
    requiresWebAuthn: true,
    options,
  });

  res.cookies.set({
    name: PENDING_SENSITIVE_ACTION_COOKIE,
    value: serializePendingSensitiveAction({
      userId: dbUser.id,
      purpose,
    }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return res;
}

export async function verifySensitiveReauth(params: {
  body: unknown;
  meta: RequestMeta;
}) {
  const cookieStore = await cookies();
  const pendingCookie = cookieStore.get(PENDING_SENSITIVE_ACTION_COOKIE)?.value;

  if (!pendingCookie) {
    return unauthorized("Pending sensitive action not found");
  }

  const pending = parsePendingSensitiveAction(pendingCookie);

  const rateLimit = await checkReauthRateLimit({
    ipAddress: params.meta.ipAddress,
    userId: pending.userId,
    purpose: pending.purpose,
  });

  if (rateLimit.blocked) {
    await auditAction({
      actorUserId: pending.userId,
      action: "SENSITIVE_REAUTH_RATE_LIMITED",
      targetType: "AdminUser",
      targetId: pending.userId,
      meta: params.meta,
    });

    return tooManyRequests(
      `Too many verification attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`
    );
  }

  const body = params.body as Record<string, unknown> | null;
  const response = body?.response;

  if (!response) {
    await recordReauthFailure({
      ipAddress: params.meta.ipAddress,
      userId: pending.userId,
      purpose: pending.purpose,
    });

    return badRequest("Missing WebAuthn response");
  }

  try {
    await verifyWebAuthnAuthentication({
      userId: pending.userId,
      response,
    });
  } catch (error) {
    await recordReauthFailure({
      ipAddress: params.meta.ipAddress,
      userId: pending.userId,
      purpose: pending.purpose,
    });

    await auditAction({
      actorUserId: pending.userId,
      action: "SENSITIVE_REAUTH_FAILED",
      targetType: "AdminUser",
      targetId: pending.userId,
      meta: params.meta,
    });

    throw error;
  }

  await clearReauthFailures({
    ipAddress: params.meta.ipAddress,
    userId: pending.userId,
    purpose: pending.purpose,
  });

  await auditAction({
    actorUserId: pending.userId,
    action: "SENSITIVE_REAUTH_SUCCESS",
    targetType: "AdminUser",
    targetId: pending.userId,
    meta: params.meta,
  });

  const res = ok({
    message: "Verification successful",
  });

  res.cookies.set({
    name: PENDING_SENSITIVE_ACTION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.cookies.set({
    name: VERIFIED_SENSITIVE_ACTION_COOKIE,
    value: serializeVerifiedSensitiveAction({
      userId: pending.userId,
      purpose: pending.purpose,
      verifiedAt: Date.now(),
    }),
    path: "/",
    maxAge: getVerifiedSensitiveActionTtlSeconds(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res;
}