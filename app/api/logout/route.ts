import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSessionByToken, getSessionCookieName } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;

  let deletedSession = null;

  if (sessionToken) {
    deletedSession = await deleteSessionByToken(sessionToken);
  }

  const userAgent = req.headers.get("user-agent");
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  if (deletedSession?.userId) {
    await createAuditLog({
      actorUserId: deletedSession.userId,
      action: "LOGOUT",
      targetType: "AdminSession",
      targetId: deletedSession.id,
      ipAddress,
      userAgent,
    });
  }

  const res = NextResponse.json({ message: "Logged out" });

  res.cookies.set({
    name: getSessionCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res;
}