import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireRecentSensitiveAction } from "@/lib/sensitive-action";
import {
	decryptString,
	encryptString,
} from "@/lib/crypto";
import {
	decryptTotpSecret,
	encryptTotpSecret,
	generateTotpSecret,
	generateTotpSetup,
	verifyTotpCode,
} from "@/lib/totp";

const TOTP_SETUP_COOKIE = "admin_totp_setup_secret";

export async function POST(req: Request) {
	try {
		const user = await requireAdminUser();

		const allowed = await requireRecentSensitiveAction({
			userId: user.id,
			purpose: "totp_management",
		});

		if (!allowed) {
			return NextResponse.json(
				{ message: "Fresh verification is required" },
				{ status: 403 }
			);
		}

		const body = await req.json().catch(() => null);
		const action = String(body?.action ?? "").trim();

		if (action === "start_setup") {
			const secretBase32 = generateTotpSecret();
			const { otpauthUrl } = generateTotpSetup(secretBase32, user.email);
			const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

			const res = NextResponse.json({
				message: "TOTP setup started",
				qrCodeDataUrl,
				secretBase32,
			});

			res.cookies.set({
				name: TOTP_SETUP_COOKIE,
				value: encryptString(secretBase32),
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: 10 * 60,
			});

			return res;
		}

		if (action === "confirm_setup") {
			const token = String(body?.token ?? "").trim();

			if (!/^\d{6}$/.test(token)) {
				return NextResponse.json(
					{ message: "Valid 6-digit TOTP code is required" },
					{ status: 400 }
				);
			}

			const cookieStore = await cookies();
			const encryptedSetupSecret = cookieStore.get(TOTP_SETUP_COOKIE)?.value;

			if (!encryptedSetupSecret) {
				return NextResponse.json(
					{ message: "TOTP setup session expired. Start again." },
					{ status: 400 }
				);
			}

			const secretBase32 = decryptString(encryptedSetupSecret);

			const isValid = verifyTotpCode({
				secretBase32,
				token,
				accountName: user.email,
			});

			if (!isValid) {
				return NextResponse.json(
					{ message: "Invalid TOTP code" },
					{ status: 400 }
				);
			}

			const existingTotp = await prisma.adminTotp.findUnique({
				where: { userId: user.id },
			});

			await prisma.adminTotp.upsert({
				where: { userId: user.id },
				update: {
					secretEncrypted: encryptTotpSecret(secretBase32),
					isEnabled: true,
				},
				create: {
					userId: user.id,
					secretEncrypted: encryptTotpSecret(secretBase32),
					isEnabled: true,
				},
			});

			await createAuditLog({
				actorUserId: user.id,
				action: existingTotp?.isEnabled ? "TOTP_REPLACED" : "TOTP_ENABLED",
				targetType: "AdminUser",
				targetId: user.id,
				ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
				userAgent: req.headers.get("user-agent"),
			});

			const res = NextResponse.json({
				message: existingTotp?.isEnabled
					? "TOTP replaced successfully"
					: "TOTP enabled successfully",
			});

			res.cookies.set({
				name: TOTP_SETUP_COOKIE,
				value: "",
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: 0,
			});

			return res;
		}

		if (action === "remove_totp") {
			const existingTotp = await prisma.adminTotp.findUnique({
				where: { userId: user.id },
			});

			if (!existingTotp || !existingTotp.isEnabled) {
				return NextResponse.json(
					{ message: "TOTP is not enabled" },
					{ status: 400 }
				);
			}

			await prisma.adminTotp.update({
				where: { userId: user.id },
				data: {
					isEnabled: false,
					secretEncrypted: encryptTotpSecret(generateTotpSecret()),
				},
			});

			await createAuditLog({
				actorUserId: user.id,
				action: "TOTP_DISABLED",
				targetType: "AdminUser",
				targetId: user.id,
				ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
				userAgent: req.headers.get("user-agent"),
			});

			const res = NextResponse.json({
				message: "TOTP removed successfully",
			});

			res.cookies.set({
				name: TOTP_SETUP_COOKIE,
				value: "",
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: 0,
			});

			return res;
		}

		return NextResponse.json(
			{ message: "Invalid TOTP action" },
			{ status: 400 }
		);
	} catch (error) {
		console.error("ADMIN TOTP ERROR:", error);
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}
}