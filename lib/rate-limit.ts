import "server-only";

import { prisma } from "@/lib/prisma";

const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_BLOCK_MS = 15 * 60 * 1000;

const MAX_LOGIN_FAILURES_PER_IP = 10;
const MAX_LOGIN_FAILURES_PER_EMAIL = 5;

type RateLimitCheckResult = {
  blocked: boolean;
  retryAfterSeconds: number;
  scope?: string;
};

function normalizeIp(ipAddress?: string | null) {
  return (ipAddress ?? "").trim();
}

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function makeIpScope(ipAddress?: string | null) {
  const normalized = normalizeIp(ipAddress);
  return normalized ? `login:ip:${normalized}` : null;
}

function makeEmailScope(email?: string | null) {
  const normalized = normalizeEmail(email);
  return normalized ? `login:email:${normalized}` : null;
}

async function checkScope(scope: string | null): Promise<RateLimitCheckResult> {
  if (!scope) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const row = await prisma.loginThrottle.findUnique({
    where: { scope },
  });

  if (!row?.blockedUntil) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const blockedUntil = row.blockedUntil.getTime();

  if (blockedUntil <= now) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  return {
    blocked: true,
    retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
    scope,
  };
}

async function recordFailureForScope(scope: string | null, maxFailures: number) {
  if (!scope) {
    return;
  }

  const now = new Date();
  const row = await prisma.loginThrottle.findUnique({
    where: { scope },
  });

  if (!row) {
    await prisma.loginThrottle.create({
      data: {
        scope,
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
      },
    });
    return;
  }

  const nowMs = now.getTime();
  const firstAttemptMs = row.firstAttemptAt.getTime();
  const blockedUntilMs = row.blockedUntil?.getTime() ?? 0;

  if (blockedUntilMs > nowMs) {
    return;
  }

  const isNewWindow = nowMs - firstAttemptMs > LOGIN_RATE_LIMIT_WINDOW_MS;

  if (isNewWindow) {
    await prisma.loginThrottle.update({
      where: { scope },
      data: {
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        blockedUntil: null,
      },
    });
    return;
  }

  const nextCount = row.count + 1;
  const shouldBlock = nextCount >= maxFailures;

  await prisma.loginThrottle.update({
    where: { scope },
    data: {
      count: nextCount,
      lastAttemptAt: now,
      blockedUntil: shouldBlock
        ? new Date(nowMs + LOGIN_RATE_LIMIT_BLOCK_MS)
        : null,
    },
  });
}

async function clearScope(scope: string | null) {
  if (!scope) {
    return;
  }

  await prisma.loginThrottle.deleteMany({
    where: { scope },
  });
}

export async function checkLoginRateLimit(params: {
  ipAddress?: string | null;
  email?: string | null;
}): Promise<RateLimitCheckResult> {
  const ipResult = await checkScope(makeIpScope(params.ipAddress));
  if (ipResult.blocked) {
    return ipResult;
  }

  const emailResult = await checkScope(makeEmailScope(params.email));
  if (emailResult.blocked) {
    return emailResult;
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export async function recordLoginFailure(params: {
  ipAddress?: string | null;
  email?: string | null;
}) {
  await Promise.all([
    recordFailureForScope(makeIpScope(params.ipAddress), MAX_LOGIN_FAILURES_PER_IP),
    recordFailureForScope(makeEmailScope(params.email), MAX_LOGIN_FAILURES_PER_EMAIL),
  ]);
}

export async function clearLoginFailures(params: {
  ipAddress?: string | null;
  email?: string | null;
}) {
  await Promise.all([
    clearScope(makeIpScope(params.ipAddress)),
    clearScope(makeEmailScope(params.email)),
  ]);
}