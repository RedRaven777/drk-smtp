import "server-only";

const ALLOWED_ORIGINS = [
  process.env.APP_ORIGIN,
].filter(Boolean) as string[];

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return "";
  }
}

export function assertSameOrigin(request: Request) {
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");

  if (!originHeader && !refererHeader) {
    throw new Error("Missing origin");
  }

  const origin = originHeader ? normalizeOrigin(originHeader) : null;
  const referer = refererHeader ? normalizeOrigin(refererHeader) : null;

  const isAllowed =
    (origin && ALLOWED_ORIGINS.includes(origin)) ||
    (referer && ALLOWED_ORIGINS.includes(referer));

  if (!isAllowed) {
    throw new Error("Invalid origin");
  }
}