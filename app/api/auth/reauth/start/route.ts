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

export async function POST(req: Request) {
  try {
    const user = await requireAdminUser();
    const body = await req.json().catch(() => null);

    const password = String(body?.password ?? "");
    const totp = String(body?.totp ?? "").trim();
    const purpose = String(body?.purpose ?? "").trim();

    if (!isSensitiveActionPurpose(purpose)) {
      return NextResponse.json(
        { message: "Invalid re-auth purpose" },
        { status: 400 }
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const passwordOk = await verifyPassword(password, dbUser.passwordHash);

    if (!passwordOk) {
      await createAuditLog({
        actorUserId: dbUser.id,
        action: "SENSITIVE_REAUTH_FAILED",
        targetType: "AdminUser",
        targetId: dbUser.id,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      });

      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    }

    const isTotpEnabled = Boolean(dbUser.totp?.isEnabled);

    // Без TOTP дозволяємо тільки повторне увімкнення TOTP
    if (!isTotpEnabled && purpose !== "totp_management") {
      return NextResponse.json(
        { message: "TOTP must be enabled before managing this section" },
        { status: 403 }
      );
    }

    if (isTotpEnabled) {
      if (!/^\d{6}$/.test(totp)) {
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
        await createAuditLog({
          actorUserId: dbUser.id,
          action: "SENSITIVE_REAUTH_FAILED",
          targetType: "AdminUser",
          targetId: dbUser.id,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: req.headers.get("user-agent"),
        });

        return NextResponse.json(
          { message: "Invalid TOTP code" },
          { status: 401 }
        );
      }
    }

    if (dbUser.webauthnCredentials.length === 0) {
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