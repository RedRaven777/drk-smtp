import * as OTPAuth from "otpauth";
import { decryptString, encryptString } from "@/lib/crypto";

const TOTP_ISSUER = process.env.TOTP_ISSUER || "drkloos-smtp";

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function buildTotp(secretBase32: string, accountName: string) {
  return new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function generateTotpSetup(secretBase32: string, accountName: string) {
  const totp = buildTotp(secretBase32, accountName);

  return {
    otpauthUrl: totp.toString(),
    secretBase32,
  };
}

export function verifyTotpCode(params: {
  secretBase32: string;
  token: string;
  accountName?: string;
}) {
  const totp = buildTotp(
    params.secretBase32,
    params.accountName ?? "admin"
  );

  const delta = totp.validate({
    token: params.token,
    window: 1,
  });

  return delta !== null;
}

export function encryptTotpSecret(secretBase32: string): string {
  return encryptString(secretBase32);
}

export function decryptTotpSecret(secretEncrypted: string): string {
  return decryptString(secretEncrypted);
}