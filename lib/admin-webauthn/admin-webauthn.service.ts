import "server-only";

import { prisma } from "@/lib/prisma/prisma.client";
import { countAdminSecurityKeys } from "@/lib/bootstrap/bootstrap.service";
import { auditAction } from "@/lib/audit/audit.service";
import type { RequestMeta } from "@/lib/api/api.request";
import { badRequest, conflict, forbidden, ok } from "@/lib/api/api.response";
import {
  createWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
} from "@/lib/webauthn/webauthn.service";
import { requireRecentSensitiveAction } from "@/lib/security/sensitive-action.service";
import { toCleanString } from "@/lib/validation/validation.service";

const SETUP_REQUIRED_KEYS = 2;
const MINIMUM_REMAINING_KEYS = 1;

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

export async function listAdminSecurityKeys(params: { userId: string }) {
  const credentials = await listWebAuthnCredentialsForAdmin(params.userId);

  return ok({
    credentials: credentials.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      lastUsedAt: item.lastUsedAt ? item.lastUsedAt.toISOString() : null,
    })),
    minimumKeys: MINIMUM_REMAINING_KEYS,
  });
}

export async function renameAdminSecurityKey(params: {
  userId: string;
  body: unknown;
  meta: RequestMeta;
}) {
  const body = params.body as Record<string, unknown> | null;
  const credentialId = toCleanString(body?.credentialId);
  const name = toCleanString(body?.name);

  if (!credentialId) {
    return badRequest("Credential id is required");
  }

  if (!name) {
    return badRequest("Key name is required");
  }

  try {
    const updated = await renameWebAuthnCredential({
      userId: params.userId,
      credentialId,
      name,
    });

    await auditAction({
      actorUserId: params.userId,
      action: "WEBAUTHN_RENAMED",
      targetType: "AdminWebAuthnCredential",
      targetId: updated.id,
      meta: params.meta,
    });

    return ok({
      message: "Security key renamed",
      credential: {
        id: updated.id,
        name: updated.name,
      },
    });
  } catch (error) {
    if (error instanceof WebAuthnAdminError) {
      return conflict(error.message);
    }

    throw error;
  }
}

export async function removeAdminSecurityKey(params: {
  userId: string;
  body: unknown;
  meta: RequestMeta;
}) {
  const body = params.body as Record<string, unknown> | null;
  const credentialId = toCleanString(body?.credentialId);

  if (!credentialId) {
    return badRequest("Credential id is required");
  }

  try {
    const deleted = await deleteWebAuthnCredential({
      userId: params.userId,
      credentialId,
      minimumRemaining: MINIMUM_REMAINING_KEYS,
    });

    await auditAction({
      actorUserId: params.userId,
      action: "WEBAUTHN_REMOVED",
      targetType: "AdminWebAuthnCredential",
      targetId: deleted.id,
      meta: params.meta,
    });

    return ok({
      message: "Security key removed",
    });
  } catch (error) {
    if (error instanceof WebAuthnAdminError) {
      return conflict(error.message);
    }

    throw error;
  }
}

export async function ensureWebAuthnManagementAllowed(params: {
  userId: string;
}) {
  const currentKeyCount = await countAdminSecurityKeys(params.userId);

  if (currentKeyCount >= SETUP_REQUIRED_KEYS) {
    const allowed = await requireRecentSensitiveAction({
      userId: params.userId,
      purpose: "webauthn_management",
    });

    if (!allowed) {
      return false;
    }
  }

  return true;
}

export async function createAdminWebAuthnRegistrationOptions(params: {
  userId: string;
  userEmail: string;
  meta: RequestMeta;
}) {
  const allowed = await ensureWebAuthnManagementAllowed({
    userId: params.userId,
  });

  if (!allowed) {
    return forbidden("Fresh verification is required");
  }

  const options = await createWebAuthnRegistrationOptions({
    userId: params.userId,
    userEmail: params.userEmail,
  });

  await auditAction({
    actorUserId: params.userId,
    action: "WEBAUTHN_REGISTRATION_OPTIONS_CREATED",
    targetType: "AdminUser",
    targetId: params.userId,
    meta: params.meta,
  });

  return ok({ options });
}

export async function verifyAdminWebAuthnRegistration(params: {
  userId: string;
  body: unknown;
  meta: RequestMeta;
}) {
  const allowed = await ensureWebAuthnManagementAllowed({
    userId: params.userId,
  });

  if (!allowed) {
    return forbidden("Fresh verification is required");
  }

  const body = params.body as Record<string, unknown> | null;
  const response = body?.response;
  const name = typeof body?.name === "string" ? body.name : null;

  if (!response) {
    return badRequest("Missing WebAuthn response");
  }

  const verification = await verifyWebAuthnRegistration({
    userId: params.userId,
    response,
    name,
  });

  await auditAction({
    actorUserId: params.userId,
    action: "WEBAUTHN_REGISTERED",
    targetType: "AdminUser",
    targetId: params.userId,
    meta: params.meta,
  });

  return ok({
    message: "Security key registered successfully",
    verified: verification.verified,
  });
}