import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "admin_session";

export function getSessionCookieName() {
	return SESSION_COOKIE_NAME;
}

export function generateSessionToken(): string {
	return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

export async function createSession(params: {
	userId: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	ttlSeconds?: number;
}) {
	const ttlSeconds = params.ttlSeconds ?? 60 * 60;
	const token = generateSessionToken();
	const sessionTokenHash = hashSessionToken(token);
	const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

	await prisma.adminSession.create({
		data: {
			userId: params.userId,
			sessionTokenHash,
			expiresAt,
			ipAddress: params.ipAddress ?? null,
			userAgent: params.userAgent ?? null,
		},
	});

	return { token, expiresAt };
}

export async function getSessionByToken(token: string) {
	const sessionTokenHash = hashSessionToken(token);

	return prisma.adminSession.findUnique({
		where: { sessionTokenHash },
		include: { user: true },
	});
}

export async function deleteSessionByToken(token: string) {
	const sessionTokenHash = hashSessionToken(token);

	await prisma.adminSession.deleteMany({
		where: { sessionTokenHash },
	});
}