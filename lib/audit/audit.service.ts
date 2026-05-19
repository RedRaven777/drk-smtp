import "server-only";

import { prisma } from "@/lib/prisma/prisma.client";
import type { RequestMeta } from "@/lib/api/api.request";

type CreateAuditLogParams = {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AuditActionParams = {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta: RequestMeta;
};

export async function createAuditLog({
  actorUserId,
  action,
  targetType,
  targetId,
  ipAddress,
  userAgent,
}: CreateAuditLogParams) {
  return prisma.auditLog.create({
    data: {
      actorUserId: actorUserId ?? null,
      action,
      targetType,
      targetId: targetId ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });
}

export async function auditAction({
  actorUserId,
  action,
  targetType,
  targetId,
  meta,
}: AuditActionParams) {
  return createAuditLog({
    actorUserId,
    action,
    targetType,
    targetId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}