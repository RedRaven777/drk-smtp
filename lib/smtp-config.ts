import { prisma } from "@/lib/prisma";
import { decryptString, encryptString } from "@/lib/crypto";
import { SmtpConfigKey } from "@/app/generated/prisma";

export async function upsertSmtpConfig(input: {
	key: SmtpConfigKey;
	smtpUser?: string | null;
	smtpPassword?: string | null;
	recipient?: string | null;
	smtpHost?: string | null;
	smtpPort?: number | null;
	updatedByUserId?: string | null;
}) {
	return prisma.smtpConfig.upsert({
	where: { key: input.key },
	update: {
		smtpUser: input.smtpUser ?? null,
		smtpPasswordEncrypted: input.smtpPassword
		? encryptString(input.smtpPassword)
		: null,
		recipient: input.recipient ?? null,
		smtpHost: input.smtpHost ?? null,
		smtpPort: input.smtpPort ?? null,
		updatedByUserId: input.updatedByUserId ?? null,
	},
	create: {
		key: input.key,
		smtpUser: input.smtpUser ?? null,
		smtpPasswordEncrypted: input.smtpPassword
		? encryptString(input.smtpPassword)
		: null,
		recipient: input.recipient ?? null,
		smtpHost: input.smtpHost ?? null,
		smtpPort: input.smtpPort ?? null,
		updatedByUserId: input.updatedByUserId ?? null,
	},
	});
}

export async function getSmtpConfig(key: SmtpConfigKey) {
	const config = await prisma.smtpConfig.findUnique({
	where: { key },
	});

	if (!config) return null;

	return {
	...config,
	smtpPassword: config.smtpPasswordEncrypted
		? decryptString(config.smtpPasswordEncrypted)
		: null,
	};
}