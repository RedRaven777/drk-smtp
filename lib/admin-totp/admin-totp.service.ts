import "server-only";

import { cookies } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { auditAction } from "@/lib/audit/audit.service";
import type { RequestMeta } from "@/lib/api/request";
import { badRequest, ok } from "@/lib/api/response";
import { decryptString, encryptString } from "@/lib/crypto";
import {
  encryptTotpSecret,
  generateTotpSecret,
  generateTotpSetup,
  verifyTotpCode,
} from "@/lib/totp";
import { isValidTotpCode, toCleanString } from "@/lib/validation";

const TOTP_SETUP_COOKIE = "admin_totp_setup_secret";

export function getTotpAction(body: unknown) {
  return toCleanString((body as Record<string, unknown> | null)?.action);
}

export async function startAdminTotpSetup(params: {
  userId: string;
  userEmail: string;
}) {
  const secretBase32 = generateTotpSecret();
  const { otpauthUrl } = generateTotpSetup(secretBase32, params.userEmail);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  const res = ok({
    message: "TOTP setup started",
    qrCodeDataUrl,
    secretBase32,
  });

  res.cookies.set({
    name: TOTP_SETUP_COOKIE,
    value: encryptString(secretBase32),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return res;
}

export async function confirmAdminTotpSetup(params: {
  userId: string;
  userEmail: string;
  body: unknown;
  meta: RequestMeta;
}) {
  const body = params.body as Record<string, unknown> | null;
  const token = toCleanString(body?.token);

  if (!isValidTotpCode(token)) {
    return badRequest("Valid 6-digit TOTP code is required");
  }

  const cookieStore = await cookies();
  const encryptedSetupSecret = cookieStore.get(TOTP_SETUP_COOKIE)?.value;

  if (!encryptedSetupSecret) {
    return badRequest("TOTP setup session expired. Start again.");
  }

  const secretBase32 = decryptString(encryptedSetupSecret);

  const isValid = verifyTotpCode({
    secretBase32,
    token,
    accountName: params.userEmail,
  });

  if (!isValid) {
    return badRequest("Invalid TOTP code");
  }

  const existingTotp = await prisma.adminTotp.findUnique({
    where: { userId: params.userId },
  });

  await prisma.adminTotp.upsert({
    where: { userId: params.userId },
    update: {
      secretEncrypted: encryptTotpSecret(secretBase32),
      isEnabled: true,
    },
    create: {
      userId: params.userId,
      secretEncrypted: encryptTotpSecret(secretBase32),
      isEnabled: true,
    },
  });

  await auditAction({
    actorUserId: params.userId,
    action: existingTotp?.isEnabled ? "TOTP_REPLACED" : "TOTP_ENABLED",
    targetType: "AdminUser",
    targetId: params.userId,
    meta: params.meta,
  });

  const res = ok({
    message: existingTotp?.isEnabled
      ? "TOTP replaced successfully"
      : "TOTP enabled successfully",
  });

  res.cookies.set({
    name: TOTP_SETUP_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}

export async function removeAdminTotp(params: {
  userId: string;
  meta: RequestMeta;
}) {
  const existingTotp = await prisma.adminTotp.findUnique({
    where: { userId: params.userId },
  });

  if (!existingTotp || !existingTotp.isEnabled) {
    return badRequest("TOTP is not enabled");
  }

  await prisma.adminTotp.update({
    where: { userId: params.userId },
    data: {
      isEnabled: false,
      secretEncrypted: encryptTotpSecret(generateTotpSecret()),
    },
  });

  await auditAction({
    actorUserId: params.userId,
    action: "TOTP_DISABLED",
    targetType: "AdminUser",
    targetId: params.userId,
    meta: params.meta,
  });

  const res = ok({
    message: "TOTP removed successfully",
  });

  res.cookies.set({
    name: TOTP_SETUP_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}