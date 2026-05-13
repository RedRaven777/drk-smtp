import { NextResponse } from "next/server";
import { withApiSecurity } from "@/lib/api-guard";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptString, decryptString } from "@/lib/crypto";
import { createAuditLog } from "@/lib/audit";
import { requireRecentSensitiveAction } from "@/lib/sensitive-action";

const ALLOWED_KEYS = [
  "CAREER",
  "CONTACTS",
  "NEWRECIPE",
  "CONTACTS_POPUP",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

function isAllowedKey(value: string): value is AllowedKey {
  return ALLOWED_KEYS.includes(value as AllowedKey);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function handler(req: Request) {
  try {
    const user = await requireAdminUser();

    const allowed = await requireRecentSensitiveAction({
      userId: user.id,
      purpose: "smtp_secret_management",
    });

    if (!allowed) {
      return NextResponse.json(
        { message: "Fresh verification is required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);

    const key = String(body?.key ?? "").trim();
    const smtpUser = String(body?.smtpUser ?? "").trim();
    const currentPassword = String(body?.currentPassword ?? "");
    const newPassword = String(body?.newPassword ?? "");
    const currentRecipient = String(body?.currentRecipient ?? "").trim();
    const newRecipient = String(body?.newRecipient ?? "").trim();
    const smtpHost = String(body?.smtpHost ?? "").trim();
    const smtpPort = Number(body?.smtpPort);

    if (!isAllowedKey(key)) {
      return NextResponse.json(
        { message: "Invalid SMTP config key" },
        { status: 400 }
      );
    }

    if (!smtpUser || !isValidEmail(smtpUser)) {
      return NextResponse.json(
        { message: "Valid SMTP user email is required" },
        { status: 400 }
      );
    }

    if (!smtpHost) {
      return NextResponse.json(
        { message: "SMTP host is required" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return NextResponse.json(
        { message: "SMTP port must be between 1 and 65535" },
        { status: 400 }
      );
    }

    const existing = await prisma.smtpConfig.findUnique({
      where: { key },
    });

    let nextPasswordEncrypted = existing?.smtpPasswordEncrypted ?? null;
    let nextRecipientEncrypted = existing?.recipientEncrypted ?? null;

    if (existing?.smtpPasswordEncrypted) {
      if (newPassword) {
        if (!currentPassword) {
          return NextResponse.json(
            { message: "Current SMTP password is required" },
            { status: 400 }
          );
        }

        const decryptedCurrentPassword = decryptString(
          existing.smtpPasswordEncrypted
        );

        if (decryptedCurrentPassword !== currentPassword) {
          return NextResponse.json(
            { message: "Current SMTP password is incorrect" },
            { status: 403 }
          );
        }

        nextPasswordEncrypted = encryptString(newPassword);
      }
    } else {
      if (!newPassword) {
        return NextResponse.json(
          { message: "SMTP password is required" },
          { status: 400 }
        );
      }

      nextPasswordEncrypted = encryptString(newPassword);
    }

    if (existing?.recipientEncrypted) {
      if (newRecipient) {
        if (!currentRecipient) {
          return NextResponse.json(
            { message: "Current recipient is required" },
            { status: 400 }
          );
        }

        const decryptedCurrentRecipient = decryptString(
          existing.recipientEncrypted
        );

        if (decryptedCurrentRecipient !== currentRecipient) {
          return NextResponse.json(
            { message: "Current recipient is incorrect" },
            { status: 403 }
          );
        }

        if (!isValidEmail(newRecipient)) {
          return NextResponse.json(
            { message: "Valid new recipient email is required" },
            { status: 400 }
          );
        }

        nextRecipientEncrypted = encryptString(newRecipient);
      }
    } else {
      if (!newRecipient || !isValidEmail(newRecipient)) {
        return NextResponse.json(
          { message: "Valid recipient email is required" },
          { status: 400 }
        );
      }

      nextRecipientEncrypted = encryptString(newRecipient);
    }

    const saved = await prisma.smtpConfig.upsert({
      where: { key },
      update: {
        smtpUser,
        smtpPasswordEncrypted: nextPasswordEncrypted,
        recipientEncrypted: nextRecipientEncrypted,
        smtpHost,
        smtpPort,
        updatedByUserId: user.id,
      },
      create: {
        key,
        smtpUser,
        smtpPasswordEncrypted: nextPasswordEncrypted,
        recipientEncrypted: nextRecipientEncrypted,
        smtpHost,
        smtpPort,
        updatedByUserId: user.id,
      },
    });

    await createAuditLog({
      actorUserId: user.id,
      action: "SMTP_CONFIG_UPDATED",
      targetType: "SmtpConfig",
      targetId: saved.id,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({
      message: "SMTP config saved successfully",
    });
  } catch (error) {
    console.error("SMTP CONFIG ERROR:", error);
    return NextResponse.json(
      { message: "Failed to save SMTP config" },
      { status: 500 }
    );
  }
}

export const POST = withApiSecurity(handler);