import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { verifyWebAuthnRegistration } from "@/lib/webauthn";
import { createAuditLog } from "@/lib/audit";
import { countAdminSecurityKeys } from "@/lib/bootstrap";
import { requireRecentSensitiveAction } from "@/lib/sensitive-action";

const MINIMUM_KEYS = 2;

export async function POST(req: Request) {
  try {
    const user = await requireAdminUser();
    const currentKeyCount = await countAdminSecurityKeys(user.id);

    if (currentKeyCount >= MINIMUM_KEYS) {
      const allowed = await requireRecentSensitiveAction({
        userId: user.id,
        purpose: "webauthn_management",
      });

      if (!allowed) {
        return NextResponse.json(
          { message: "Fresh verification is required" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();

    const response = body?.response;
    const name = typeof body?.name === "string" ? body.name : null;

    if (!response) {
      return NextResponse.json(
        { message: "Missing WebAuthn response" },
        { status: 400 }
      );
    }

    const verification = await verifyWebAuthnRegistration({
      userId: user.id,
      response,
      name,
    });

    const userAgent = req.headers.get("user-agent");
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await createAuditLog({
      actorUserId: user.id,
      action: "WEBAUTHN_REGISTERED",
      targetType: "AdminUser",
      targetId: user.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      message: "Security key registered successfully",
      verified: verification.verified,
    });
  } catch (error) {
    console.error("WEBAUTHN REGISTER VERIFY ERROR:", error);
    return NextResponse.json(
      { message: "Failed to verify WebAuthn registration" },
      { status: 400 }
    );
  }
}