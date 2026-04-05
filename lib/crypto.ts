import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ENCRYPTION_KEY_HEX = process.env.APP_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_HEX) {
  throw new Error("APP_ENCRYPTION_KEY is not set");
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error("APP_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
}

const ALGORITHM = "aes-256-gcm";

export function encryptString(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptString(payload: string): string {
  const [ivB64, authTagB64, encryptedB64] = payload.split(":");

  if (!ivB64 || !authTagB64 || !encryptedB64) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}