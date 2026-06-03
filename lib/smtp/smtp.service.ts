import "server-only";

import { prisma } from "@/lib/prisma/prisma.client";
import { encryptString, decryptString } from "@/lib/crypto/crypto.service";

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

function maskEmail(value: string | null | undefined) {
  if (!value) return null;

  const [local, domain] = value.split("@");

  if (!local || !domain) {
    return "••••";
  }

  const visibleChars = Math.min(2, local.length);
  return `${local.slice(0, visibleChars)}***@${domain}`;
}

export async function getAllSmtpConfigsForAdmin() {
  const configs = await prisma.smtpConfig.findMany({
    orderBy: {
      key: "asc",
    },
  });

  return configs.map((config) => {
    const recipient = config.recipientEncrypted
      ? decryptString(config.recipientEncrypted)
      : null;

    return {
      id: config.id,
      key: config.key,
      smtpUserMasked: maskEmail(config.smtpUser),
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      hasPassword: Boolean(config.smtpPasswordEncrypted),
      hasRecipient: Boolean(config.recipientEncrypted),
      recipientMasked: maskEmail(recipient),
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  });
}

export async function saveSmtpConfig(params: {
  userId: string;
  key: string;
  smtpUser?: string;
  password?: string;
  recipient?: string;
  smtpHost: string;
  smtpPort: number;
}) {
  const key = params.key.trim();

  if (!isAllowedKey(key)) {
    throw new Error("Invalid SMTP config key");
  }

  const smtpUser = params.smtpUser?.trim().toLowerCase() ?? "";
  const password = params.password ?? "";
  const recipient = params.recipient?.trim().toLowerCase() ?? "";
  const smtpHost = params.smtpHost.trim();
  const smtpPort = params.smtpPort;

  if (!smtpHost) {
    throw new Error("SMTP host is required");
  }

  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error("SMTP port must be between 1 and 65535");
  }

  const existing = await prisma.smtpConfig.findUnique({
    where: {
      key,
    },
  });

  if (!existing) {
    if (!smtpUser || !isValidEmail(smtpUser)) {
      throw new Error("Valid SMTP user email is required");
    }

    if (!password) {
      throw new Error("SMTP password is required");
    }

    if (!recipient || !isValidEmail(recipient)) {
      throw new Error("Valid recipient email is required");
    }

    return prisma.smtpConfig.create({
      data: {
        key,
        smtpUser,
        smtpPasswordEncrypted: encryptString(password),
        recipientEncrypted: encryptString(recipient),
        smtpHost,
        smtpPort,
        updatedByUserId: params.userId,
      },
    });
  }

  const nextData: {
    smtpUser?: string;
    smtpPasswordEncrypted?: string;
    recipientEncrypted?: string;
    smtpHost: string;
    smtpPort: number;
    updatedByUserId: string;
  } = {
    smtpHost,
    smtpPort,
    updatedByUserId: params.userId,
  };

  if (smtpUser) {
    if (!isValidEmail(smtpUser)) {
      throw new Error("Valid SMTP user email is required");
    }

    nextData.smtpUser = smtpUser;
  }

  if (password) {
    nextData.smtpPasswordEncrypted = encryptString(password);
  }

  if (recipient) {
    if (!isValidEmail(recipient)) {
      throw new Error("Valid recipient email is required");
    }

    nextData.recipientEncrypted = encryptString(recipient);
  }

  return prisma.smtpConfig.update({
    where: {
      key,
    },
    data: nextData,
  });
}