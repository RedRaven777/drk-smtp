import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, getSessionCookieName } from "@/lib/session";
import { verifyWebAuthnAuthentication } from "@/lib/webauthn";
import {
  parsePendingWebAuthnLogin,
  PENDING_WEBAUTHN_LOGIN_COOKIE,
} from "@/lib/pending-webauthn-login";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const pendingCookie = cookieStore.get(PENDING_WEBAUTHN_LOGIN_COOKIE)?.value;

    if (!pendingCookie) {
      return NextResponse.json(
        { message: "Pending WebAuthn login not found" },
        { status: 401 }
      );
    }

    const pending = parsePendingWebAuthnLogin(pendingCookie);
    const body = await req.json();
    const response = body?.response;

    if (!response) {
      return NextResponse.json(
        { message: "Missing WebAuthn response" },
        { status: 400 }
      );
    }

    await verifyWebAuthnAuthentication({
      userId: pending.userId,
      response,
    });

    const userAgent = req.headers.get("user-agent");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

    const { token, expiresAt } = await createSession({
      userId: pending.userId,
      userAgent,
      ipAddress,
      idleTtlSeconds: 15 * 60,
      absoluteTtlSeconds: 8 * 60 * 60,
    });

    await createAuditLog({
      actorUserId: pending.userId,
      action: "LOGIN_SUCCESS",
      targetType: "AdminUser",
      targetId: pending.userId,
      ipAddress,
      userAgent,
    });

    const res = NextResponse.json({ message: "Logged in" });

    res.cookies.set({
      name: PENDING_WEBAUTHN_LOGIN_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.cookies.set({
      name: getSessionCookieName(),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return res;
  } catch (error) {
    console.error("WEBAUTHN LOGIN VERIFY ERROR:", error);
    return NextResponse.json(
      { message: "Failed to verify security key" },
      { status: 400 }
    );
  }
}