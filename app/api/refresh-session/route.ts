import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, touchSessionByToken } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;

  const res = NextResponse.json({ message: "Session checked" });

  if (!sessionToken) {
    res.cookies.set({
      name: getSessionCookieName(),
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return NextResponse.json({ message: "No session" }, { status: 401 });
  }

  const result = await touchSessionByToken(sessionToken);

  const userAgent = req.headers.get("user-agent");
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  if (result.status === "expired") {
    if (result.session?.userId) {
      await createAuditLog({
        actorUserId: result.session.userId,
        action: "SESSION_EXPIRED",
        targetType: "AdminSession",
        targetId: result.session.id,
        ipAddress,
        userAgent,
      });
    }

    const expiredRes = NextResponse.json(
      { message: "Session expired" },
      { status: 401 }
    );

    expiredRes.cookies.set({
      name: getSessionCookieName(),
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return expiredRes;
  }

  if (result.status === "missing" || !result.session) {
    const missingRes = NextResponse.json(
      { message: "Session not found" },
      { status: 401 }
    );

    missingRes.cookies.set({
      name: getSessionCookieName(),
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return missingRes;
  }

  res.cookies.set({
    name: getSessionCookieName(),
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: result.session.expiresAt,
  });

  return res;
}