import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isAppInitialized } from "@/lib/bootstrap";
import { initialSetupStartSchema } from "@/lib/schemas";
import { generateTotpSecret, generateTotpSetup } from "@/lib/totp";
import { serializePendingSetup, SETUP_COOKIE_NAME } from "@/lib/setup";

export async function POST(req: Request) {
	try {
		const initialized = await isAppInitialized();

		if (initialized) {
			return NextResponse.json(
				{ message: "Application is already initialized" },
				{ status: 403 }
			);
		}

		const body = await req.json().catch(() => null);
		const parsed = initialSetupStartSchema.safeParse(body);

		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			const firstError =
				fieldErrors.email?.[0] ||
				fieldErrors.password?.[0] ||
				fieldErrors.confirmPassword?.[0] ||
				"Invalid input";

			return NextResponse.json(
				{
					message: firstError,
					errors: fieldErrors,
				},
				{ status: 400 }
			);
		}

		const email = parsed.data.email.trim().toLowerCase();

		const existingUser = await prisma.adminUser.findUnique({
			where: { email },
		});

		if (existingUser) {
			return NextResponse.json(
				{ message: "Admin user already exists" },
				{ status: 409 }
			);
		}

		const passwordHash = await hashPassword(parsed.data.password);
		const totpSecretBase32 = generateTotpSecret();
		const { otpauthUrl } = generateTotpSetup(totpSecretBase32, email);
		const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

		const pendingSetup = serializePendingSetup({
			email,
			passwordHash,
			totpSecretBase32,
		});

		const res = NextResponse.json({
			email,
			qrCodeDataUrl,
			secretBase32: totpSecretBase32,
		});

		res.cookies.set({
			name: SETUP_COOKIE_NAME,
			value: pendingSetup,
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 10 * 60,
		});

		return res;
	} catch (error) {
		console.error("SETUP START ERROR:", error);
		return NextResponse.json(
			{ message: "Failed to start setup" },
			{ status: 500 }
		);
	}
}