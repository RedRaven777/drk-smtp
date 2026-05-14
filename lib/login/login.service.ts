import "server-only";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp";
import { isAppInitialized } from "@/lib/bootstrap";
import {
  checkLoginRateLimit,
  checkUnlockRateLimit,
  recordLoginFailure,
  recordUnlockFailure,
} from "@/lib/rate-limit";
import { auditAction } from "@/lib/audit/audit.service";
import { createWebAuthnAuthenticationOptions } from "@/lib/webauthn";
import {
  PENDING_WEBAUTHN_LOGIN_COOKIE,
  serializePendingWebAuthnLogin,
} from "@/lib/pending-webauthn-login";
import { getCurrentAdminUser } from "@/lib/auth";
import { createSession, getSessionCookieName } from "@/lib/session";
import type { RequestMeta } from "@/lib/api/request";
import { forbidden, locked, ok, tooManyRequests, unauthorized } from "@/lib/api/response";
import { isValidTotpCode, toCleanLowercaseString, toCleanString } from "@/lib/validation";

const ACCOUNT_LOCKOUT_THRESHOLD = 5;
const ACCOUNT_LOCKOUT_MINUTES = 15;

async function createSetupSecurityKeysSession(params: {
  userId: string;
  meta: RequestMeta;
}) {
  const { token, expiresAt } = await createSession({
    userId: params.userId,
    userAgent: params.meta.userAgent,
    ipAddress: params.meta.ipAddress,
    idleTtlSeconds: 15 * 60,
    absoluteTtlSeconds: 8 * 60 * 60,
  });

  const res = ok({
    requiresWebAuthn: false,
    setupSecurityKeysRequired: true,
    redirectTo: "/setup/security-key",
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

async function createPendingWebAuthnLogin(params: {
  userId: string;
}) {
  const options = await createWebAuthnAuthenticationOptions({
    userId: params.userId,
  });

  const res = ok({
    requiresWebAuthn: true,
    options,
  });

  res.cookies.set({
    name: PENDING_WEBAUTHN_LOGIN_COOKIE,
    value: serializePendingWebAuthnLogin({ userId: params.userId }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return res;
}

export async function handleAdminUnlock(params: {
  body: unknown;
  meta: RequestMeta;
}) {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return unauthorized();
  }

  const unlockRateLimit = await checkUnlockRateLimit({
    ipAddress: params.meta.ipAddress,
    userId: currentUser.id,
  });

  if (unlockRateLimit.blocked) {
    await auditAction({
      actorUserId: currentUser.id,
      action: "ADMIN_UNLOCK_RATE_LIMITED",
      targetType: "AdminUser",
      targetId: currentUser.id,
      meta: params.meta,
    });

    return tooManyRequests(
      `Too many unlock attempts. Try again in ${unlockRateLimit.retryAfterSeconds} seconds.`
    );
  }

  const body = params.body as Record<string, unknown> | null;
  const password = String(body?.password ?? "");
  const totp = toCleanString(body?.totp);

  const user = await prisma.adminUser.findUnique({
    where: { id: currentUser.id },
    include: {
      totp: true,
      webauthnCredentials: true,
    },
  });

  if (!user || !user.isActive) {
    return unauthorized();
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    await recordUnlockFailure({
      ipAddress: params.meta.ipAddress,
      userId: user.id,
    });

    await auditAction({
      actorUserId: user.id,
      action: "ADMIN_UNLOCK_FAILED",
      targetType: "AdminUser",
      targetId: user.id,
      meta: params.meta,
    });

    return unauthorized("Invalid password");
  }

  if (!user.totp?.isEnabled) {
    await recordUnlockFailure({
      ipAddress: params.meta.ipAddress,
      userId: user.id,
    });

    return forbidden("TOTP must be enabled");
  }

  if (!isValidTotpCode(totp)) {
    await recordUnlockFailure({
      ipAddress: params.meta.ipAddress,
      userId: user.id,
    });

    return unauthorized("Valid TOTP code is required");
  }

  const secretBase32 = decryptTotpSecret(user.totp.secretEncrypted);

  const totpOk = verifyTotpCode({
    secretBase32,
    token: totp,
    accountName: user.email,
  });

  if (!totpOk) {
    await recordUnlockFailure({
      ipAddress: params.meta.ipAddress,
      userId: user.id,
    });

    await auditAction({
      actorUserId: user.id,
      action: "ADMIN_UNLOCK_FAILED",
      targetType: "AdminUser",
      targetId: user.id,
      meta: params.meta,
    });

    return unauthorized("Invalid TOTP code");
  }

  if (user.webauthnCredentials.length < 1) {
    return createSetupSecurityKeysSession({
      userId: user.id,
      meta: params.meta,
    });
  }

  return createPendingWebAuthnLogin({
    userId: user.id,
  });
}

export async function handleAdminLogin(params: {
  body: unknown;
  meta: RequestMeta;
}) {
  const initialized = await isAppInitialized();

  if (!initialized) {
    return forbidden("Application is not initialized yet");
  }

  const body = params.body as Record<string, unknown> | null;
  const email = toCleanLowercaseString(body?.email);
  const password = String(body?.password ?? "");
  const totp = toCleanString(body?.totp);

  const rateLimit = await checkLoginRateLimit({
    ipAddress: params.meta.ipAddress,
    email,
  });

  if (rateLimit.blocked) {
    await auditAction({
      action: "LOGIN_RATE_LIMITED",
      targetType: "AdminUser",
      meta: params.meta,
    });

    return tooManyRequests(
      `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`
    );
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
    include: {
      totp: true,
      webauthnCredentials: true,
    },
  });

  if (!user || !user.isActive) {
    await recordLoginFailure({
      ipAddress: params.meta.ipAddress,
      email,
    });

    await auditAction({
      action: "LOGIN_FAILED",
      targetType: "AdminUser",
      meta: params.meta,
    });

    return unauthorized("Invalid credentials");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return locked();
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    const nextFailures = user.failedLoginAttempts + 1;
    const lockedUntil =
      nextFailures >= ACCOUNT_LOCKOUT_THRESHOLD
        ? new Date(Date.now() + ACCOUNT_LOCKOUT_MINUTES * 60 * 1000)
        : null;

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: nextFailures,
        lockedUntil,
      },
    });

    await recordLoginFailure({
      ipAddress: params.meta.ipAddress,
      email,
    });

    return lockedUntil ? locked() : unauthorized("Invalid credentials");
  }

  if (!user.totp?.isEnabled) {
    return forbidden("TOTP must be enabled");
  }

  if (!isValidTotpCode(totp)) {
    await recordLoginFailure({
      ipAddress: params.meta.ipAddress,
      email,
    });

    return unauthorized("TOTP code is required");
  }

  const secretBase32 = decryptTotpSecret(user.totp.secretEncrypted);

  const totpOk = verifyTotpCode({
    secretBase32,
    token: totp,
    accountName: user.email,
  });

  if (!totpOk) {
    await recordLoginFailure({
      ipAddress: params.meta.ipAddress,
      email,
    });

    return unauthorized("Invalid TOTP code");
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  if (user.webauthnCredentials.length < 1) {
    return createSetupSecurityKeysSession({
      userId: user.id,
      meta: params.meta,
    });
  }

  return createPendingWebAuthnLogin({
    userId: user.id,
  });
}