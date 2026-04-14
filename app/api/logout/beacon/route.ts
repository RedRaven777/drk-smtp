import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSessionByToken, getSessionCookieName } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(getSessionCookieName())?.value;

    if (sessionToken) {
      const deletedSession = await deleteSessionByToken(sessionToken);

      if (deletedSession?.userId) {
        await createAuditLog({
          actorUserId: deletedSession.userId,
          action: "LOGOUT_TAB_CLOSE",
          targetType: "AdminSession",
          targetId: deletedSession.id,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: req.headers.get("user-agent"),
        });
      }
    }

    const res = new NextResponse(null, { status: 204 });

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
  } catch (error) {
    console.error("LOGOUT BEACON ERROR:", error);
    return new NextResponse(null, { status: 204 });
  }
}