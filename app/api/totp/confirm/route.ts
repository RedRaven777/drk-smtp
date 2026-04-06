import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/auth";
import { decryptString } from "@/lib/crypto";
import { encryptTotpSecret, verifyTotpCode } from "@/lib/totp";

const TOTP_SETUP_COOKIE = "totp_setup_secret";

export async function POST(req: Request) {
	const user = await getCurrentAdminUser();

	if (!user) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const body = await req.json().catch(() => null);
	const token = String(body?.token ?? "").trim();

	if (!/^\d{6}$/.test(token)) {
		return NextResponse.json(
			{ message: "Invalid TOTP code format" },
			{ status: 400 }
		);
	}

	const cookieStore = await cookies();
	const encryptedSetupSecret = cookieStore.get(TOTP_SETUP_COOKIE)?.value;

	if (!encryptedSetupSecret) {
		return NextResponse.json(
			{ message: "TOTP setup session expired" },
			{ status: 400 }
		);
	}

	const secretBase32 = decryptString(encryptedSetupSecret);
	const isValid = verifyTotpCode({
		secretBase32,
		token,
	});

	if (!isValid) {
		return NextResponse.json(
			{ message: "Invalid TOTP code" },
			{ status: 400 }
		);
	}

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

	await prisma.auditLog.create({
		data: {
			actorUserId: user.id,
			action: "TOTP_ENABLED",
			targetType: "AdminUser",
			targetId: user.id,
		},
	});

	cookieStore.set({
		name: TOTP_SETUP_COOKIE,
		value: "",
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 0,
	});

	return NextResponse.json({ message: "TOTP enabled" });
}