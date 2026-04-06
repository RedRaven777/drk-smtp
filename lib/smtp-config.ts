import { prisma } from "@/lib/prisma";
import { decryptString, encryptString } from "@/lib/crypto";
import { SmtpConfigKey } from "@/app/generated/prisma";

export type SmtpConfigInput = {
  key: SmtpConfigKey;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  recipient?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  updatedByUserId?: string | null;
};

export type SmtpConfigView = {
  key: SmtpConfigKey;
  smtpUser: string;
  recipient: string;
  smtpHost: string;
  smtpPort: number | null;
  hasPassword: boolean;
};

export async function upsertSmtpConfig(input: SmtpConfigInput) {
  const existing = await prisma.smtpConfig.findUnique({
    where: { key: input.key },
  });

  const smtpPasswordEncrypted =
    input.smtpPassword !== undefined
      ? input.smtpPassword
        ? encryptString(input.smtpPassword)
        : null
      : existing?.smtpPasswordEncrypted ?? null;

  const config = await prisma.smtpConfig.upsert({
    where: { key: input.key },
    update: {
      smtpUser: input.smtpUser ?? null,
      smtpPasswordEncrypted,
      recipient: input.recipient ?? null,
      smtpHost: input.smtpHost ?? null,
      smtpPort: input.smtpPort ?? null,
      updatedByUserId: input.updatedByUserId ?? null,
    },
    create: {
      key: input.key,
      smtpUser: input.smtpUser ?? null,
      smtpPasswordEncrypted,
      recipient: input.recipient ?? null,
      smtpHost: input.smtpHost ?? null,
      smtpPort: input.smtpPort ?? null,
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
  };
}

export async function getAllSmtpConfigsForAdmin(): Promise<SmtpConfigView[]> {
  const configs = await prisma.smtpConfig.findMany({
    orderBy: { key: "asc" },
  });

  return configs.map((config) => ({
    key: config.key,
    smtpUser: config.smtpUser ?? "",
    recipient: config.recipient ?? "",
    smtpHost: config.smtpHost ?? "",
    smtpPort: config.smtpPort ?? null,
    hasPassword: Boolean(config.smtpPasswordEncrypted),
  }));
}