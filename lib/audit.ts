import "server-only";

import { prisma } from "@/lib/prisma";

type CreateAuditLogInput = {
	actorUserId?: string | null;
	action: string;
	targetType: string;
	targetId?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
};

export async function createAuditLog(input: CreateAuditLogInput) {
	return prisma.auditLog.create({
		data: {
			actorUserId: input.actorUserId ?? null,
			action: input.action,
			targetType: input.targetType,
			targetId: input.targetId ?? null,
			ipAddress: input.ipAddress ?? null,
			userAgent: input.userAgent ?? null,
		},
	});
}