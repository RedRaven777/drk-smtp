import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp";
import { prisma } from "@/lib/prisma";
import { createWebAuthnAuthenticationOptions } from "@/lib/webauthn";
import {
  PENDING_SENSITIVE_ACTION_COOKIE,
  serializePendingSensitiveAction,
  isSensitiveActionPurpose,
} from "@/lib/sensitive-action";
import { createAuditLog } from "@/lib/audit";
import {
  checkReauthRateLimit,
  recordReauthFailure,
} from "@/lib/rate-limit";
import { withApiSecurity } from "@/lib/api-guard";

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
    const user = await requireAdminUser();
    const body = await req.json().catch(() => null);

    const password = String(body?.password ?? "");
    const totp = String(body?.totp ?? "").trim();
    const purpose = String(body?.purpose ?? "").trim();

    const { ipAddress, userAgent } = getRequestMeta(req);

    if (!isSensitiveActionPurpose(purpose)) {
      return NextResponse.json(
        { message: "Invalid re-auth purpose" },
        { status: 400 }
      );
    }

    const rateLimit = await checkReauthRateLimit({
      ipAddress,
      userId: user.id,
      purpose,
    });

    if (rateLimit.blocked) {
      await createAuditLog({
        actorUserId: user.id,
        action: "SENSITIVE_REAUTH_RATE_LIMITED",
        targetType: "AdminUser",
        targetId: user.id,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          message: `Too many verification attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const dbUser = await prisma.adminUser.findUnique({
      where: { id: user.id },
      include: {
        totp: true,
        webauthnCredentials: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      await recordReauthFailure({
        ipAddress,
        userId: user.id,
        purpose,
      });

      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const passwordOk = await verifyPassword(password, dbUser.passwordHash);

    if (!passwordOk) {
      await recordReauthFailure({
        ipAddress,
        userId: dbUser.id,
        purpose,
      });

      await createAuditLog({
        actorUserId: dbUser.id,
        action: "SENSITIVE_REAUTH_FAILED",
        targetType: "AdminUser",
        targetId: dbUser.id,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    }

    const isTotpEnabled = Boolean(dbUser.totp?.isEnabled);

    if (!isTotpEnabled && purpose !== "totp_management") {
      await recordReauthFailure({
        ipAddress,
        userId: dbUser.id,
        purpose,
      });

      return NextResponse.json(
        { message: "TOTP must be enabled before managing this section" },
        { status: 403 }
      );
    }

    if (isTotpEnabled) {
      if (!/^\d{6}$/.test(totp)) {
        await recordReauthFailure({
          ipAddress,
          userId: dbUser.id,
          purpose,
        });

        return NextResponse.json(
          { message: "Valid TOTP code is required" },
          { status: 401 }
        );
      }

      const secretBase32 = decryptTotpSecret(dbUser.totp!.secretEncrypted);
      const totpOk = verifyTotpCode({
        secretBase32,
        token: totp,
        accountName: dbUser.email,
      });

      if (!totpOk) {
        await recordReauthFailure({
          ipAddress,
          userId: dbUser.id,
          purpose,
        });

        await createAuditLog({
          actorUserId: dbUser.id,
          action: "SENSITIVE_REAUTH_FAILED",
          targetType: "AdminUser",
          targetId: dbUser.id,
          ipAddress,
          userAgent,
        });

        return NextResponse.json(
          { message: "Invalid TOTP code" },
          { status: 401 }
        );
      }
    }

    if (dbUser.webauthnCredentials.length === 0) {
      await recordReauthFailure({
        ipAddress,
        userId: dbUser.id,
        purpose,
      });

      return NextResponse.json(
        { message: "No registered security keys found" },
        { status: 400 }
      );
    }

    const options = await createWebAuthnAuthenticationOptions({
      userId: dbUser.id,
    });

    const res = NextResponse.json({
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
  } catch (error) {
    console.error("SENSITIVE REAUTH START ERROR:", error);
    return NextResponse.json(
      { message: "Failed to start sensitive re-auth" },
      { status: 400 }
    );
  }
}

export const POST = withApiSecurity(handler);