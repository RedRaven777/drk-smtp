import "server-only";

import { prisma } from "@/lib/prisma";

export class WebAuthnAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebAuthnAdminError";
  }
}

export async function renameWebAuthnCredential(params: {
  userId: string;
  credentialId: string;
  name: string;
}) {
  const credential = await prisma.adminWebAuthnCredential.findUnique({
    where: { id: params.credentialId },
  });

  if (!credential || credential.userId !== params.userId) {
    throw new WebAuthnAdminError("Security key not found");
  }

  return prisma.adminWebAuthnCredential.update({
    where: { id: params.credentialId },
    data: {
      name: params.name.trim(),
    },
  });
}

export async function deleteWebAuthnCredential(params: {
  userId: string;
  credentialId: string;
  minimumRemaining?: number;
}) {
  const minimumRemaining = params.minimumRemaining ?? 2;

  const credential = await prisma.adminWebAuthnCredential.findUnique({
    where: { id: params.credentialId },
  });

  if (!credential || credential.userId !== params.userId) {
    throw new WebAuthnAdminError("Security key not found");
  }

  const totalCount = await prisma.adminWebAuthnCredential.count({
    where: { userId: params.userId },
  });

  if (totalCount - 1 < minimumRemaining) {
    throw new WebAuthnAdminError(
      `At least ${minimumRemaining} security keys must remain registered`
    );
  }

  return prisma.adminWebAuthnCredential.delete({
    where: { id: params.credentialId },
  });
}

export async function listWebAuthnCredentialsForAdmin(userId: string) {
  return prisma.adminWebAuthnCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}