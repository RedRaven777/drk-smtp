import "server-only";

import { prisma } from "@/lib/prisma/prisma.client";
import { hashPassword } from "@/lib/password/password.service";
import { getSessionCookieName } from "@/lib/session/session.service";
import { auditAction } from "@/lib/audit/audit.service";
import type { RequestMeta } from "@/lib/api/api.response";
import {
  isValidEmail,
  toCleanLowercaseString,
  toCleanString,
} from "@/lib/validation/validation.service";
import { badRequest, conflict, ok } from "@/lib/api/api.response";

export function getAccountAction(body: unknown) {
  return toCleanString((body as Record<string, unknown> | null)?.action);
}

export async function changeAdminEmail(params: {
  userId: string;
  body: unknown;
  meta: RequestMeta;
}) {
  const body = params.body as Record<string, unknown> | null;
  const newEmail = toCleanLowercaseString(body?.newEmail);

  if (!newEmail) {
    return badRequest("New email is required");
  }

  if (!isValidEmail(newEmail)) {
    return badRequest("Valid email is required");
  }

  const existing = await prisma.adminUser.findUnique({
    where: { email: newEmail },
  });

  if (existing && existing.id !== params.userId) {
    return conflict("This email is already in use");
  }

  const updated = await prisma.adminUser.update({
    where: { id: params.userId },
    data: { email: newEmail },
  });

  await auditAction({
    actorUserId: params.userId,
    action: "ACCOUNT_EMAIL_CHANGED",
    targetType: "AdminUser",
    targetId: params.userId,
    meta: params.meta,
  });

  return ok({
    message: "Email updated successfully",
    email: updated.email,
  });
}

export async function changeAdminPassword(params: {
  userId: string;
  body: unknown;
  meta: RequestMeta;
}) {
  const body = params.body as Record<string, unknown> | null;
  const newPassword = String(body?.newPassword ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!newPassword || newPassword.length < 12) {
    return badRequest("New password must be at least 12 characters");
  }

  if (newPassword !== confirmPassword) {
    return badRequest("Passwords do not match");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.adminUser.update({
    where: { id: params.userId },
    data: { passwordHash },
  });

  await prisma.adminSession.deleteMany({
    where: { userId: params.userId },
  });

  await auditAction({
    actorUserId: params.userId,
    action: "ACCOUNT_PASSWORD_CHANGED",
    targetType: "AdminUser",
    targetId: params.userId,
    meta: params.meta,
  });

  const res = ok({
    message: "Password updated successfully. Please log in again.",
    forceLogout: true,
  });

  res.cookies.set({
    name: getSessionCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res;
}