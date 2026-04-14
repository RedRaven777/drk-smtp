import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyWebAuthnAuthentication } from "@/lib/webauthn";
import {
  PENDING_SENSITIVE_ACTION_COOKIE,
  VERIFIED_SENSITIVE_ACTION_COOKIE,
  parsePendingSensitiveAction,
  serializeVerifiedSensitiveAction,
  getVerifiedSensitiveActionTtlSeconds,
} from "@/lib/sensitive-action";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const pendingCookie = cookieStore.get(PENDING_SENSITIVE_ACTION_COOKIE)?.value;

    if (!pendingCookie) {
      return NextResponse.json(
        { message: "Pending sensitive action not found" },
        { status: 401 }
      );
    }

    const pending = parsePendingSensitiveAction(pendingCookie);
    const body = await req.json().catch(() => null);
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
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await createAuditLog({
      actorUserId: pending.userId,
      action: "SENSITIVE_REAUTH_SUCCESS",
      targetType: "AdminUser",
      targetId: pending.userId,
      ipAddress,
      userAgent,
    });

    const res = NextResponse.json({
      message: "Sensitive re-auth verified",
    });

    res.cookies.set({
      name: PENDING_SENSITIVE_ACTION_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.cookies.set({
      name: VERIFIED_SENSITIVE_ACTION_COOKIE,
      value: serializeVerifiedSensitiveAction({
        userId: pending.userId,
        purpose: pending.purpose,
        verifiedAt: Date.now(),
      }),
      path: "/",
      maxAge: getVerifiedSensitiveActionTtlSeconds(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    console.error("SENSITIVE REAUTH VERIFY ERROR:", error);
    return NextResponse.json(
      { message: "Failed to verify sensitive re-auth" },
      { status: 400 }
    );
  }
}