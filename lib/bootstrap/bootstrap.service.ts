import "server-only";

import { prisma } from "@/lib/prisma/prisma.client";

export async function isAppInitialized(): Promise<boolean> {
  const admin = await prisma.adminUser.findFirst({
    select: {
      id: true,
    },
  });

  return Boolean(admin);
}

export async function countAdminSecurityKeys(userId: string): Promise<number> {
  const keys = await prisma.adminWebAuthnCredential.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  return keys.length;
}