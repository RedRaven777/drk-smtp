import "server-only";

import { decryptString, encryptString } from "@/lib/crypto";
import { cookies } from "next/headers";

export const PENDING_SENSITIVE_ACTION_COOKIE =
  "admin_pending_sensitive_action";
export const VERIFIED_SENSITIVE_ACTION_COOKIE =
  "admin_verified_sensitive_action";

const VERIFIED_SENSITIVE_ACTION_TTL_SECONDS = 5 * 60;

export const SENSITIVE_ACTION_PURPOSES = [
  "webauthn_management",
  "account_management",
  "totp_management",
  "smtp_secret_management",
] as const;

export type SensitiveActionPurpose =
  (typeof SENSITIVE_ACTION_PURPOSES)[number];

export type PendingSensitiveActionPayload = {
  userId: string;
  purpose: SensitiveActionPurpose;
};

export type VerifiedSensitiveActionPayload = {
  userId: string;
  purpose: SensitiveActionPurpose;
  verifiedAt: number;
};

export function isSensitiveActionPurpose(
  value: string
): value is SensitiveActionPurpose {
  return (SENSITIVE_ACTION_PURPOSES as readonly string[]).includes(value);
}

export function serializePendingSensitiveAction(
  payload: PendingSensitiveActionPayload
): string {
  return encryptString(JSON.stringify(payload));
}

export function parsePendingSensitiveAction(
  value: string
): PendingSensitiveActionPayload {
  const decrypted = decryptString(value);
  const parsed = JSON.parse(decrypted) as PendingSensitiveActionPayload;

  if (
    !parsed ||
    typeof parsed.userId !== "string" ||
    !isSensitiveActionPurpose(parsed.purpose)
  ) {
    throw new Error("Invalid pending sensitive action payload");
  }

  return parsed;
}

export function serializeVerifiedSensitiveAction(
  payload: VerifiedSensitiveActionPayload
): string {
  return encryptString(JSON.stringify(payload));
}

export function parseVerifiedSensitiveAction(
  value: string
): VerifiedSensitiveActionPayload {
  const decrypted = decryptString(value);
  const parsed = JSON.parse(decrypted) as VerifiedSensitiveActionPayload;

  if (
    !parsed ||
    typeof parsed.userId !== "string" ||
    !isSensitiveActionPurpose(parsed.purpose) ||
    typeof parsed.verifiedAt !== "number"
  ) {
    throw new Error("Invalid verified sensitive action payload");
  }

  return parsed;
}

export async function requireRecentSensitiveAction(params: {
  userId: string;
  purpose: SensitiveActionPurpose;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(VERIFIED_SENSITIVE_ACTION_COOKIE)?.value;

  if (!raw) {
    return false;
  }

  try {
    const parsed = parseVerifiedSensitiveAction(raw);

    if (parsed.userId !== params.userId) {
      return false;
    }

    if (parsed.purpose !== params.purpose) {
      return false;
    }

    const ageMs = Date.now() - parsed.verifiedAt;
    return ageMs >= 0 && ageMs <= VERIFIED_SENSITIVE_ACTION_TTL_SECONDS * 1000;
  } catch {
    return false;
  }
}

export function getVerifiedSensitiveActionTtlSeconds() {
  return VERIFIED_SENSITIVE_ACTION_TTL_SECONDS;
}