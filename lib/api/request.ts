import "server-only";

export type RequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
};

export function getRequestMeta(req: Request): RequestMeta {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  return {
    ipAddress:
      forwardedFor?.split(",")[0]?.trim() ||
      realIp?.trim() ||
      cfConnectingIp?.trim() ||
      "local",
    userAgent: req.headers.get("user-agent"),
  };
}

export async function readJsonBody(req: Request) {
  return req.json().catch(() => null);
}