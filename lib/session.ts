import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_IDLE_TTL_SECONDS = 15 * 60;
const SESSION_ABSOLUTE_TTL_SECONDS = 8 * 60 * 60;

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
  idleTtlSeconds?: number;
  absoluteTtlSeconds?: number;
}) {
  const idleTtlSeconds = params.idleTtlSeconds ?? SESSION_IDLE_TTL_SECONDS;
  const absoluteTtlSeconds =
    params.absoluteTtlSeconds ?? SESSION_ABSOLUTE_TTL_SECONDS;

  const token = generateSessionToken();
  const sessionTokenHash = hashSessionToken(token);

  const now = Date.now();
  const expiresAt = new Date(now + idleTtlSeconds * 1000);
  const absoluteExpiresAt = new Date(now + absoluteTtlSeconds * 1000);

  await prisma.adminSession.create({
    data: {
      userId: params.userId,
      sessionTokenHash,
      expiresAt,
      absoluteExpiresAt,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });

  return { token, expiresAt, absoluteExpiresAt };
}

export async function getSessionByToken(token: string) {
  const sessionTokenHash = hashSessionToken(token);

  const session = await prisma.adminSession.findUnique({
    where: { sessionTokenHash },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  const now = new Date();

  if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
    await prisma.adminSession.deleteMany({
      where: { sessionTokenHash },
    });
    return null;
  }

  return session;
}

export async function touchSessionByToken(token: string) {
  const sessionTokenHash = hashSessionToken(token);

  const session = await prisma.adminSession.findUnique({
    where: { sessionTokenHash },
    include: { user: true },
  });

  if (!session) {
    return {
      status: "missing" as const,
      session: null,
    };
  }

  const now = new Date();

  if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
    await prisma.adminSession.deleteMany({
      where: { sessionTokenHash },
    });

    return {
      status: "expired" as const,
      session,
    };
  }

  const nextIdleExpiry = new Date(Date.now() + SESSION_IDLE_TTL_SECONDS * 1000);
  const nextExpiresAt =
    nextIdleExpiry < session.absoluteExpiresAt
      ? nextIdleExpiry
      : session.absoluteExpiresAt;

  const updated = await prisma.adminSession.update({
    where: { sessionTokenHash },
    data: {
      lastSeenAt: now,
      expiresAt: nextExpiresAt,
    },
    include: { user: true },
  });

  return {
    status: "valid" as const,
    session: updated,
  };
}

export async function deleteSessionByToken(token: string) {
  const sessionTokenHash = hashSessionToken(token);

  const session = await prisma.adminSession.findUnique({
    where: { sessionTokenHash },
    include: { user: true },
  });

  await prisma.adminSession.deleteMany({
    where: { sessionTokenHash },
  });

  return session;
}