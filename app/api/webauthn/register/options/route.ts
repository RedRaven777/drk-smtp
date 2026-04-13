import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { createWebAuthnRegistrationOptions } from "@/lib/webauthn";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
	try {
		const user = await requireAdminUser();

		const options = await createWebAuthnRegistrationOptions({
			userId: user.id,
			userEmail: user.email,
		});

		const userAgent = req.headers.get("user-agent");
		const forwardedFor = req.headers.get("x-forwarded-for");
		const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

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