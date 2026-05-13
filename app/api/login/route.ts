import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp";
import { isAppInitialized } from "@/lib/bootstrap";
import {
  checkLoginRateLimit,
  checkUnlockRateLimit,
  clearLoginFailures,
  recordLoginFailure,
  recordUnlockFailure,
} from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { createWebAuthnAuthenticationOptions } from "@/lib/webauthn";
import {
  PENDING_WEBAUTHN_LOGIN_COOKIE,
  serializePendingWebAuthnLogin,
} from "@/lib/pending-webauthn-login";
import { getCurrentAdminUser } from "@/lib/auth";
import { withApiSecurity } from "@/lib/api-guard";

const ACCOUNT_LOCKOUT_THRESHOLD = 5;
const ACCOUNT_LOCKOUT_MINUTES = 15;

function getRequestMeta(req: Request) {
  const userAgent = req.headers.get("user-agent");

  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cfConnectingIp?.trim() ||
    "local";

  return { ipAddress, userAgent };
}

async function handler(req: Request) {
  try {
    const initialized = await isAppInitialized();

    if (!initialized) {
      return NextResponse.json(
        { message: "Application is not initialized yet" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const unlockOnly = Boolean(body?.unlockOnly);

    const { ipAddress, userAgent } = getRequestMeta(req);

    // =========================
    // 🔐 UNLOCK FLOW
    // =========================

    if (unlockOnly) {
      const currentUser = await getCurrentAdminUser();

      if (!currentUser) {
        return NextResponse.json(
          { message: "Unauthorized" },
          { status: 401 }
        );
      }

      const unlockRateLimit = await checkUnlockRateLimit({
        ipAddress,
        userId: currentUser.id,
      });

      if (unlockRateLimit.blocked) {
        await createAuditLog({
          actorUserId: currentUser.id,
          action: "ADMIN_UNLOCK_RATE_LIMITED",
          targetType: "AdminUser",
          targetId: currentUser.id,
          ipAddress,
          userAgent,
        });

        return NextResponse.json(
          {
            message: `Too many unlock attempts. Try again in ${unlockRateLimit.retryAfterSeconds} seconds.`,
          },
          { status: 429 }
        );
      }

      const password = String(body?.password ?? "");
      const totp = String(body?.totp ?? "").trim();

      const user = await prisma.adminUser.findUnique({
        where: { id: currentUser.id },
        include: {
          totp: true,
          webauthnCredentials: true,
        },
      });

      if (!user || !user.isActive) {
        return NextResponse.json(
          { message: "Unauthorized" },
          { status: 401 }
        );
      }

      const passwordOk = await verifyPassword(password, user.passwordHash);

      if (!passwordOk) {
        await recordUnlockFailure({ ipAddress, userId: user.id });

        await createAuditLog({
          actorUserId: user.id,
          action: "ADMIN_UNLOCK_FAILED",
          targetType: "AdminUser",
          targetId: user.id,
          ipAddress,
          userAgent,
        });

        return NextResponse.json(
          { message: "Invalid password" },
          { status: 401 }
        );
      }

      if (!user.totp?.isEnabled) {
        await recordUnlockFailure({ ipAddress, userId: user.id });

        return NextResponse.json(
          { message: "TOTP must be enabled" },
          { status: 403 }
        );
      }

      if (!/^\d{6}$/.test(totp)) {
        await recordUnlockFailure({ ipAddress, userId: user.id });

        return NextResponse.json(
          { message: "Valid TOTP code is required" },
          { status: 401 }
        );
      }

      const secretBase32 = decryptTotpSecret(user.totp.secretEncrypted);
      const totpOk = verifyTotpCode({
        secretBase32,
        token: totp,
        accountName: user.email,
      });

      if (!totpOk) {
        await recordUnlockFailure({ ipAddress, userId: user.id });

        await createAuditLog({
          actorUserId: user.id,
          action: "ADMIN_UNLOCK_FAILED",
          targetType: "AdminUser",
          targetId: user.id,
          ipAddress,
          userAgent,
        });

        return NextResponse.json(
          { message: "Invalid TOTP code" },
          { status: 401 }
        );
      }

      if (user.webauthnCredentials.length < 1) {
        const { token, expiresAt } = await createSession({
          userId: user.id,
          userAgent,
          ipAddress,
          idleTtlSeconds: 15 * 60,
          absoluteTtlSeconds: 8 * 60 * 60,
        });

        const res = NextResponse.json({
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

      const options = await createWebAuthnAuthenticationOptions({
        userId: user.id,
      });

      const res = NextResponse.json({
        requiresWebAuthn: true,
        options,
      });

      res.cookies.set({
        name: PENDING_WEBAUTHN_LOGIN_COOKIE,
        value: serializePendingWebAuthnLogin({ userId: user.id }),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      });

      return res;
    }

    // =========================
    // 🔐 LOGIN FLOW
    // =========================

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const totp = String(body.totp ?? "").trim();

    const rateLimit = await checkLoginRateLimit({ ipAddress, email });

    if (rateLimit.blocked) {
      await createAuditLog({
        action: "LOGIN_RATE_LIMITED",
        targetType: "AdminUser",
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          message: `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
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
      await recordLoginFailure({ ipAddress, email });

      await createAuditLog({
        action: "LOGIN_FAILED",
        targetType: "AdminUser",
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { message: "Account temporarily locked" },
        { status: 423 }
      );
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

      await recordLoginFailure({ ipAddress, email });

      return NextResponse.json(
        { message: lockedUntil ? "Account temporarily locked" : "Invalid credentials" },
        { status: lockedUntil ? 423 : 401 }
      );
    }


    const options = await createWebAuthnAuthenticationOptions({
      userId: user.id,
    });

    const res = NextResponse.json({
      requiresWebAuthn: true,
      options,
    });

    res.cookies.set({
      name: PENDING_WEBAUTHN_LOGIN_COOKIE,
      value: serializePendingWebAuthnLogin({ userId: user.id }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    return res;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }
}


export const POST = withApiSecurity(handler);