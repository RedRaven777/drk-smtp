import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp";
import { isAppInitialized } from "@/lib/bootstrap";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { createWebAuthnAuthenticationOptions } from "@/lib/webauthn";
import {
  PENDING_WEBAUTHN_LOGIN_COOKIE,
  serializePendingWebAuthnLogin,
} from "@/lib/pending-webauthn-login";

const ACCOUNT_LOCKOUT_THRESHOLD = 5;
const ACCOUNT_LOCKOUT_MINUTES = 15;

function getRequestMeta(req: Request) {
  const userAgent = req.headers.get("user-agent");
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  return { ipAddress, userAgent };
}

export async function POST(req: Request) {
  try {
    const initialized = await isAppInitialized();

    if (!initialized) {
      return NextResponse.json(
        { message: "Application is not initialized yet" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const totp = String(body.totp ?? "").trim();

    const { ipAddress, userAgent } = getRequestMeta(req);

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
      await createAuditLog({
        actorUserId: user.id,
        action: "LOGIN_LOCKED",
        targetType: "AdminUser",
        targetId: user.id,
        ipAddress,
        userAgent,
      });

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

      await createAuditLog({
        actorUserId: user.id,
        action: lockedUntil ? "LOGIN_LOCKED" : "LOGIN_FAILED",
        targetType: "AdminUser",
        targetId: user.id,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          message: lockedUntil
            ? "Account temporarily locked"
            : "Invalid credentials",
        },
        { status: lockedUntil ? 423 : 401 }
      );
    }

    if (user.totp?.isEnabled) {
      if (!/^\d{6}$/.test(totp)) {
        await recordLoginFailure({ ipAddress, email });

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

        await createAuditLog({
          actorUserId: user.id,
          action: lockedUntil ? "LOGIN_LOCKED" : "LOGIN_FAILED",
          targetType: "AdminUser",
          targetId: user.id,
          ipAddress,
          userAgent,
        });

        return NextResponse.json(
          { message: "TOTP code is required" },
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
        await recordLoginFailure({ ipAddress, email });

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

        await createAuditLog({
          actorUserId: user.id,
          action: lockedUntil ? "LOGIN_LOCKED" : "LOGIN_FAILED",
          targetType: "AdminUser",
          targetId: user.id,
          ipAddress,
          userAgent,
        });

        return NextResponse.json(
          {
            message: lockedUntil
              ? "Account temporarily locked"
              : "Invalid TOTP code",
          },
          { status: lockedUntil ? 423 : 401 }
        );
      }
    }

    if (user.webauthnCredentials.length < 2) {
      return NextResponse.json(
        { message: "At least 2 security keys are required" },
        { status: 403 }
      );
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await clearLoginFailures({ ipAddress, email });

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