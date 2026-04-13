import "server-only";

import { prisma } from "@/lib/prisma";

export async function isAppInitialized(): Promise<boolean> {
  const adminCount = await prisma.adminUser.count();
  return adminCount > 0;
}

export async function countAdminSecurityKeys(userId: string): Promise<number> {
  return prisma.adminWebAuthnCredential.count({
    where: { userId },
  });
}

export async function doesAdminHaveMinimumSecurityKeys(
  userId: string,
  minimum = 2
): Promise<boolean> {
  const count = await countAdminSecurityKeys(userId);
  return count >= minimum;
}