import { encryptString, decryptString } from "@/lib/crypto";

export const SETUP_COOKIE_NAME = "initial_setup_session";

export type PendingSetupPayload = {
	email: string;
	passwordHash: string;
	totpSecretBase32: string;
};

export function serializePendingSetup(payload: PendingSetupPayload): string {
	return encryptString(JSON.stringify(payload));
}

export function parsePendingSetup(value: string): PendingSetupPayload {
	const decrypted = decryptString(value);
	const parsed = JSON.parse(decrypted) as PendingSetupPayload;

	if (
		!parsed ||
		typeof parsed.email !== "string" ||
		typeof parsed.passwordHash !== "string" ||
		typeof parsed.totpSecretBase32 !== "string"
	) {
		throw new Error("Invalid setup payload");
	}

	return parsed;
}