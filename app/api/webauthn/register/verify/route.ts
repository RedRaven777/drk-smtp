import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { verifyWebAuthnRegistration } from "@/lib/webauthn";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
	try {
		const user = await requireAdminUser();
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
		const forwardedFor = req.headers.get("x-forwarded-for");
		const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

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