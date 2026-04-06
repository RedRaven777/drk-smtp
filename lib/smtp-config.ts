import { prisma } from "@/lib/prisma";
import { decryptString, encryptString } from "@/lib/crypto";
import { SmtpConfigKey } from "@/app/generated/prisma/client";

export type SmtpConfigInput = {
  key: SmtpConfigKey;
  smtpUser: string;
  currentPassword?: string | null;
  newPassword?: string | null;
  currentRecipient?: string | null;
  newRecipient?: string | null;
  smtpHost: string;
  smtpPort: number;
  updatedByUserId?: string | null;
};

export type SmtpConfigView = {
  key: SmtpConfigKey;
  smtpUser: string;
  smtpHost: string;
  smtpPort: number | null;
  hasPassword: boolean;
  hasRecipient: boolean;
};

export class SmtpConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmtpConfigValidationError";
  }
}

export async function saveSmtpConfigSecure(input: SmtpConfigInput) {
  const existing = await prisma.smtpConfig.findUnique({
    where: { key: input.key },
  });

  const existingPassword = existing?.smtpPasswordEncrypted
    ? decryptString(existing.smtpPasswordEncrypted)
    : null;

  const existingRecipient = existing?.recipientEncrypted
    ? decryptString(existing.recipientEncrypted)
    : null;

  let smtpPasswordEncrypted = existing?.smtpPasswordEncrypted ?? null;
  let recipientEncrypted = existing?.recipientEncrypted ?? null;

  const hasExistingPassword = Boolean(existingPassword);
  const hasExistingRecipient = Boolean(existingRecipient);

  const nextPassword = input.newPassword?.trim() ?? "";
  const nextRecipient = input.newRecipient?.trim() ?? "";
  const currentPassword = input.currentPassword?.trim() ?? "";
  const currentRecipient = input.currentRecipient?.trim() ?? "";

  if (!hasExistingPassword && nextPassword === "") {
    throw new SmtpConfigValidationError("New password is required");
  }

  if (hasExistingPassword) {
    if (nextPassword !== "") {
      if (currentPassword === "") {
        throw new SmtpConfigValidationError(
          "Current password is required to change the password"
        );
      }

      if (currentPassword !== existingPassword) {
        throw new SmtpConfigValidationError("Current password is incorrect");
      }

      smtpPasswordEncrypted = encryptString(nextPassword);
    }
  } else {
    smtpPasswordEncrypted = encryptString(nextPassword);
  }

  if (!hasExistingRecipient && nextRecipient === "") {
    throw new SmtpConfigValidationError("New recipient is required");
  }

  if (hasExistingRecipient) {
    if (nextRecipient !== "") {
      if (currentRecipient === "") {
        throw new SmtpConfigValidationError(
          "Current recipient is required to change the recipient"
        );
      }

      if (
        currentRecipient.toLowerCase() !== existingRecipient!.trim().toLowerCase()
      ) {
        throw new SmtpConfigValidationError("Current recipient is incorrect");
      }

      recipientEncrypted = encryptString(nextRecipient);
    }
  } else {
    recipientEncrypted = encryptString(nextRecipient);
  }

  const config = await prisma.smtpConfig.upsert({
    where: { key: input.key },
    update: {
      smtpUser: input.smtpUser.trim(),
      smtpPasswordEncrypted,
      recipientEncrypted,
      smtpHost: input.smtpHost.trim(),
      smtpPort: input.smtpPort,
      updatedByUserId: input.updatedByUserId ?? null,
    },
    create: {
      key: input.key,
      smtpUser: input.smtpUser.trim(),
      smtpPasswordEncrypted,
      recipientEncrypted,
      smtpHost: input.smtpHost.trim(),
      smtpPort: input.smtpPort,
      updatedByUserId: input.updatedByUserId ?? null,
    },
  });

  return config;
}

export async function getSmtpConfigRaw(key: SmtpConfigKey) {
  const config = await prisma.smtpConfig.findUnique({
    where: { key },
  });

  if (!config) {
    return null;
  }

  return {
    ...config,
    smtpPassword: config.smtpPasswordEncrypted
      ? decryptString(config.smtpPasswordEncrypted)
      : null,
    recipient: config.recipientEncrypted
      ? decryptString(config.recipientEncrypted)
      : null,
  };
}

export async function getAllSmtpConfigsForAdmin(): Promise<SmtpConfigView[]> {
  const configs = await prisma.smtpConfig.findMany({
    orderBy: { key: "asc" },
  });

  return configs.map((config) => ({
    key: config.key,
    smtpUser: config.smtpUser ?? "",
    smtpHost: config.smtpHost ?? "",
    smtpPort: config.smtpPort ?? null,
    hasPassword: Boolean(config.smtpPasswordEncrypted),
    hasRecipient: Boolean(config.recipientEncrypted),
  }));
}