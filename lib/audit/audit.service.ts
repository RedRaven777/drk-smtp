import "server-only";

import { createAuditLog } from "@/lib/audit";
import type { RequestMeta } from "@/lib/api/request";

type AuditActionParams = {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta: RequestMeta;
};

export async function auditAction({
  actorUserId,
  action,
  targetType,
  targetId,
  meta,
}: AuditActionParams) {
  await createAuditLog({
    actorUserId: actorUserId ?? undefined,
    action,
    targetType,
    targetId: targetId ?? undefined,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
}