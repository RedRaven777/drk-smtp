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
import {
  checkReauthRateLimit,
  clearReauthFailures,
  recordReauthFailure,
} from "@/lib/rate-limit";
import { withApiSecurity } from "@/lib/api-guard";

function getRequestMeta(req: Request) {
  const userAgent = req.headers.get("user-agent");

  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cfConnectingIp?.trim() ||
    "local";

  return { ipAddress, userAgent };
}

async function handler(req: Request) {
  const { ipAddress, userAgent } = getRequestMeta(req);

  try {
    const cookieStore = await cookies();
    const pendingCookie = cookieStore.get(
      PENDING_SENSITIVE_ACTION_COOKIE
    )?.value;

    if (!pendingCookie) {
      return NextResponse.json(
        { message: "Pending sensitive action not found" },
        { status: 401 }
      );
    }

    const pending = parsePendingSensitiveAction(pendingCookie);

    const rateLimit = await checkReauthRateLimit({
      ipAddress,
      userId: pending.userId,
      purpose: pending.purpose,
    });

    if (rateLimit.blocked) {
      await createAuditLog({
        actorUserId: pending.userId,
        action: "SENSITIVE_REAUTH_RATE_LIMITED",
        targetType: "AdminUser",
        targetId: pending.userId,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          message: `Too many verification attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const response = body?.response;

    if (!response) {
      await recordReauthFailure({
        ipAddress,
        userId: pending.userId,
        purpose: pending.purpose,
      });

      return NextResponse.json(
        { message: "Missing WebAuthn response" },
        { status: 400 }
      );
    }

    try {
      await verifyWebAuthnAuthentication({
        userId: pending.userId,
        response,
      });
    } catch (error) {
      await recordReauthFailure({
        ipAddress,
        userId: pending.userId,
        purpose: pending.purpose,
      });

      await createAuditLog({
        actorUserId: pending.userId,
        action: "SENSITIVE_REAUTH_FAILED",
        targetType: "AdminUser",
        targetId: pending.userId,
        ipAddress,
        userAgent,
      });

      throw error;
    }

    await clearReauthFailures({
      ipAddress,
      userId: pending.userId,
      purpose: pending.purpose,
    });

    await createAuditLog({
      actorUserId: pending.userId,
      action: "SENSITIVE_REAUTH_SUCCESS",
      targetType: "AdminUser",
      targetId: pending.userId,
      ipAddress,
      userAgent,
    });

    const res = NextResponse.json({
      message: "Verification successful",
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
      { message: "Failed to verify security key" },
      { status: 400 }
    );
  }
}

export const POST = withApiSecurity(handler);