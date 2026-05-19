import "server-only";

import { prisma } from "@/lib/prisma/prisma.client";

export async function findAdminUserById(userId: string) {
  return prisma.adminUser.findUnique({
    where: { id: userId },
  });
}

export async function findAdminUserByEmail(email: string) {
  return prisma.adminUser.findUnique({
    where: { email },
  });
}

export async function findAdminUserWithSecurityById(userId: string) {
  return prisma.adminUser.findUnique({
    where: { id: userId },
    include: {
      totp: true,
      webauthnCredentials: true,
    },
  });
}

export async function findAdminUserWithSecurityByEmail(email: string) {
  return prisma.adminUser.findUnique({
    where: { email },
    include: {
      totp: true,
      webauthnCredentials: true,
    },
  });
}

export async function updateAdminPasswordHash(params: {
  userId: string;
  passwordHash: string;
}) {
  return prisma.adminUser.update({
    where: { id: params.userId },
    data: { passwordHash: params.passwordHash },
  });
}

export async function updateAdminEmail(params: {
  userId: string;
  email: string;
}) {
  return prisma.adminUser.update({
    where: { id: params.userId },
    data: { email: params.email },
  });
}

export async function resetAdminLoginFailures(userId: string) {
  return prisma.adminUser.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

export async function setAdminLoginFailureState(params: {
  userId: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}) {
  return prisma.adminUser.update({
    where: { id: params.userId },
    data: {
      failedLoginAttempts: params.failedLoginAttempts,
      lockedUntil: params.lockedUntil,
    },
  });
}