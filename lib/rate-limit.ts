import "server-only";

import { prisma } from "@/lib/prisma";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_BLOCK_MS = 15 * 60 * 1000;

const MAX_LOGIN_FAILURES_PER_IP = 10;
const MAX_LOGIN_FAILURES_PER_EMAIL = 5;

const MAX_UNLOCK_FAILURES_PER_IP = 10;
const MAX_UNLOCK_FAILURES_PER_USER = 5;

type RateLimitCheckResult = {
  blocked: boolean;
  retryAfterSeconds: number;
  scope?: string;
};

function normalizeIp(ipAddress?: string | null) {
  const value = (ipAddress ?? "").trim();
  return value || "local";
}

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function normalizeUserId(userId?: string | null) {
  return (userId ?? "").trim();
}

function makeLoginIpScope(ipAddress?: string | null) {
  return `login:ip:${normalizeIp(ipAddress)}`;
}

function makeLoginEmailScope(email?: string | null) {
  const normalized = normalizeEmail(email);
  return normalized ? `login:email:${normalized}` : null;
}

function makeUnlockIpScope(ipAddress?: string | null) {
  return `unlock:ip:${normalizeIp(ipAddress)}`;
}

function makeUnlockUserScope(userId?: string | null) {
  const normalized = normalizeUserId(userId);
  return normalized ? `unlock:user:${normalized}` : null;
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

async function checkScopes(scopes: Array<string | null>): Promise<RateLimitCheckResult> {
  for (const scope of scopes) {
    const result = await checkScope(scope);
    if (result.blocked) {
      return result;
    }
  }

  return { blocked: false, retryAfterSeconds: 0 };
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

  const isNewWindow = nowMs - firstAttemptMs > RATE_LIMIT_WINDOW_MS;

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
        ? new Date(nowMs + RATE_LIMIT_BLOCK_MS)
        : null,
    },
  });
}

async function recordFailuresForScopes(
  scopes: Array<{ scope: string | null; maxFailures: number }>
) {
  await Promise.all(
    scopes.map((item) => recordFailureForScope(item.scope, item.maxFailures))
  );
}

async function clearScope(scope: string | null) {
  if (!scope) {
    return;
  }

  await prisma.loginThrottle.deleteMany({
    where: { scope },
  });
}

async function clearScopes(scopes: Array<string | null>) {
  await Promise.all(scopes.map((scope) => clearScope(scope)));
}

export async function checkLoginRateLimit(params: {
  ipAddress?: string | null;
  email?: string | null;
}): Promise<RateLimitCheckResult> {
  return checkScopes([
    makeLoginIpScope(params.ipAddress),
    makeLoginEmailScope(params.email),
  ]);
}

export async function recordLoginFailure(params: {
  ipAddress?: string | null;
  email?: string | null;
}) {
  await recordFailuresForScopes([
    {
      scope: makeLoginIpScope(params.ipAddress),
      maxFailures: MAX_LOGIN_FAILURES_PER_IP,
    },
    {
      scope: makeLoginEmailScope(params.email),
      maxFailures: MAX_LOGIN_FAILURES_PER_EMAIL,
    },
  ]);
}

export async function clearLoginFailures(params: {
  ipAddress?: string | null;
  email?: string | null;
}) {
  await clearScopes([
    makeLoginIpScope(params.ipAddress),
    makeLoginEmailScope(params.email),
  ]);
}

export async function checkUnlockRateLimit(params: {
  ipAddress?: string | null;
  userId?: string | null;
}): Promise<RateLimitCheckResult> {
  return checkScopes([
    makeUnlockIpScope(params.ipAddress),
    makeUnlockUserScope(params.userId),
  ]);
}

export async function recordUnlockFailure(params: {
  ipAddress?: string | null;
  userId?: string | null;
}) {
  await recordFailuresForScopes([
    {
      scope: makeUnlockIpScope(params.ipAddress),
      maxFailures: MAX_UNLOCK_FAILURES_PER_IP,
    },
    {
      scope: makeUnlockUserScope(params.userId),
      maxFailures: MAX_UNLOCK_FAILURES_PER_USER,
    },
  ]);
}

export async function clearUnlockFailures(params: {
  ipAddress?: string | null;
  userId?: string | null;
}) {
  await clearScopes([
    makeUnlockIpScope(params.ipAddress),
    makeUnlockUserScope(params.userId),
  ]);
}