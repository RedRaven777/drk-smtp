import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createWebAuthnRegistrationOptions } from "@/lib/webauthn";
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

    const options = await createWebAuthnRegistrationOptions({
      userId: user.id,
      userEmail: user.email,
    });

    const userAgent = req.headers.get("user-agent");
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await createAuditLog({
      actorUserId: user.id,
      action: "WEBAUTHN_REGISTRATION_OPTIONS_CREATED",
      targetType: "AdminUser",
      targetId: user.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ options });
  } catch (error) {
    console.error("WEBAUTHN REGISTER OPTIONS ERROR:", error);
    return NextResponse.json(
      { message: "Failed to create WebAuthn registration options" },
      { status: 400 }
    );
  }
}