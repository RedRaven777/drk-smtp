import "server-only";

import { cookies } from "next/headers";
import { verifyWebAuthnAuthentication } from "@/lib/webauthn";
import { createSession, getSessionCookieName } from "@/lib/session";
import {
  PENDING_WEBAUTHN_LOGIN_COOKIE,
  parsePendingWebAuthnLogin,
} from "@/lib/pending-webauthn-login";
import { clearUnlockFailures, recordUnlockFailure } from "@/lib/rate-limit";
import { auditAction } from "@/lib/audit/audit.service";
import type { RequestMeta } from "@/lib/api/request";
import { badRequest, ok, unauthorized } from "@/lib/api/response";

export async function verifyPendingWebAuthnLogin(params: {
  body: unknown;
  meta: RequestMeta;
}) {
  const cookieStore = await cookies();
  const pendingCookie = cookieStore.get(PENDING_WEBAUTHN_LOGIN_COOKIE)?.value;

  if (!pendingCookie) {
    return unauthorized("Pending WebAuthn login not found");
  }

  const pending = parsePendingWebAuthnLogin(pendingCookie);
  const body = params.body as Record<string, unknown> | null;
  const response = body?.response;
  const unlockOnly = Boolean(body?.unlockOnly);

  if (!response) {
    if (unlockOnly) {
      await recordUnlockFailure({
        ipAddress: params.meta.ipAddress,
        userId: pending.userId,
      });
    }

    return badRequest("Missing WebAuthn response");
  }

  try {
    await verifyWebAuthnAuthentication({
      userId: pending.userId,
      response,
    });
  } catch (error) {
    if (unlockOnly) {
      await recordUnlockFailure({
        ipAddress: params.meta.ipAddress,
        userId: pending.userId,
      });

      await auditAction({
        actorUserId: pending.userId,
        action: "ADMIN_UNLOCK_FAILED",
        targetType: "AdminUser",
        targetId: pending.userId,
        meta: params.meta,
      });
    }

    throw error;
  }

  const res = ok({
    message: unlockOnly ? "Admin unlock verified" : "Logged in",
    unlockOnly,
  });

  res.cookies.set({
    name: PENDING_WEBAUTHN_LOGIN_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  if (unlockOnly) {
    await clearUnlockFailures({
      ipAddress: params.meta.ipAddress,
      userId: pending.userId,
    });

    await auditAction({
      actorUserId: pending.userId,
      action: "ADMIN_UNLOCK_SUCCESS",
      targetType: "AdminUser",
      targetId: pending.userId,
      meta: params.meta,
    });

    return res;
  }

  const { token, expiresAt } = await createSession({
    userId: pending.userId,
    userAgent: params.meta.userAgent,
    ipAddress: params.meta.ipAddress,
    idleTtlSeconds: 15 * 60,
    absoluteTtlSeconds: 8 * 60 * 60,
  });

  await auditAction({
    actorUserId: pending.userId,
    action: "LOGIN_SUCCESS",
    targetType: "AdminUser",
    targetId: pending.userId,
    meta: params.meta,
  });

  res.cookies.set({
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return res;
}