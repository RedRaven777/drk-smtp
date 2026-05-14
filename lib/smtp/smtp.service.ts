import "server-only";

import { prisma } from "@/lib/prisma";
import { encryptString, decryptString } from "@/lib/crypto";
import { auditAction } from "@/lib/audit/audit.service";
import type { RequestMeta } from "@/lib/api/request";
import { badRequest, forbidden, ok } from "@/lib/api/response";
import {
  isValidEmail,
  isValidPort,
  toCleanString,
} from "@/lib/validation";

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

export async function saveSmtpConfig(params: {
  userId: string;
  body: unknown;
  meta: RequestMeta;
}) {
  const body = params.body as Record<string, unknown> | null;

  const key = toCleanString(body?.key);
  const smtpUser = toCleanString(body?.smtpUser);
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");
  const currentRecipient = toCleanString(body?.currentRecipient);
  const newRecipient = toCleanString(body?.newRecipient);
  const smtpHost = toCleanString(body?.smtpHost);
  const smtpPort = Number(body?.smtpPort);

  if (!isAllowedKey(key)) {
    return badRequest("Invalid SMTP config key");
  }

  if (!smtpUser || !isValidEmail(smtpUser)) {
    return badRequest("Valid SMTP user email is required");
  }

  if (!smtpHost) {
    return badRequest("SMTP host is required");
  }

  if (!isValidPort(smtpPort)) {
    return badRequest("SMTP port must be between 1 and 65535");
  }

  const existing = await prisma.smtpConfig.findUnique({
    where: { key },
  });

  let nextPasswordEncrypted = existing?.smtpPasswordEncrypted ?? null;
  let nextRecipientEncrypted = existing?.recipientEncrypted ?? null;

  if (existing?.smtpPasswordEncrypted) {
    if (newPassword) {
      if (!currentPassword) {
        return badRequest("Current SMTP password is required");
      }

      const decryptedCurrentPassword = decryptString(
        existing.smtpPasswordEncrypted
      );

      if (decryptedCurrentPassword !== currentPassword) {
        return forbidden("Current SMTP password is incorrect");
      }

      nextPasswordEncrypted = encryptString(newPassword);
    }
  } else {
    if (!newPassword) {
      return badRequest("SMTP password is required");
    }

    nextPasswordEncrypted = encryptString(newPassword);
  }

  if (existing?.recipientEncrypted) {
    if (newRecipient) {
      if (!currentRecipient) {
        return badRequest("Current recipient is required");
      }

      const decryptedCurrentRecipient = decryptString(
        existing.recipientEncrypted
      );

      if (decryptedCurrentRecipient !== currentRecipient) {
        return forbidden("Current recipient is incorrect");
      }

      if (!isValidEmail(newRecipient)) {
        return badRequest("Valid new recipient email is required");
      }

      nextRecipientEncrypted = encryptString(newRecipient);
    }
  } else {
    if (!newRecipient || !isValidEmail(newRecipient)) {
      return badRequest("Valid recipient email is required");
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
      updatedByUserId: params.userId,
    },
    create: {
      key,
      smtpUser,
      smtpPasswordEncrypted: nextPasswordEncrypted,
      recipientEncrypted: nextRecipientEncrypted,
      smtpHost,
      smtpPort,
      updatedByUserId: params.userId,
    },
  });

  await auditAction({
    actorUserId: params.userId,
    action: "SMTP_CONFIG_UPDATED",
    targetType: "SmtpConfig",
    targetId: saved.id,
    meta: params.meta,
  });

  return ok({
    message: "SMTP config saved successfully",
  });
}