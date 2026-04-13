import "server-only";

import { encryptString, decryptString } from "@/lib/crypto";

export const PENDING_WEBAUTHN_LOGIN_COOKIE = "admin_pending_webauthn_login";

export type PendingWebAuthnLoginPayload = {
  userId: string;
};

export function serializePendingWebAuthnLogin(
  payload: PendingWebAuthnLoginPayload
): string {
  return encryptString(JSON.stringify(payload));
}

export function parsePendingWebAuthnLogin(
  value: string
): PendingWebAuthnLoginPayload {
  const decrypted = decryptString(value);
  const parsed = JSON.parse(decrypted) as PendingWebAuthnLoginPayload;

  if (!parsed || typeof parsed.userId !== "string") {
    throw new Error("Invalid pending WebAuthn login payload");
  }

  return parsed;
}