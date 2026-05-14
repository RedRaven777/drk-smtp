import "server-only";

import { countAdminSecurityKeys } from "@/lib/bootstrap";
import { auditAction } from "@/lib/audit/audit.service";
import type { RequestMeta } from "@/lib/api/request";
import { badRequest, conflict, forbidden, ok } from "@/lib/api/response";
import {
  WebAuthnAdminError,
  deleteWebAuthnCredential,
  listWebAuthnCredentialsForAdmin,
  renameWebAuthnCredential,
} from "@/lib/webauthn-admin";
import {
  createWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
} from "@/lib/webauthn";
import { requireRecentSensitiveAction } from "@/lib/sensitive-action";
import { toCleanString } from "@/lib/validation";

const SETUP_REQUIRED_KEYS = 2;
const MINIMUM_REMAINING_KEYS = 1;

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