import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma/prisma.client";
import { isAppInitialized } from "@/lib/bootstrap/bootstrap.service";
import { initialSetupConfirmSchema } from "@/lib/setup/setup.schema";

import { parsePendingSetup, SETUP_COOKIE_NAME } from "@/lib/setup/setup.service";
import { encryptTotpSecret, verifyTotpCode } from "@/lib/totp/totp.service";
import { createSession, getSessionCookieName } from "@/lib/session/session.service";

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
		const parsed = initialSetupConfirmSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{ message: "Invalid TOTP code" },
				{ status: 400 }
			);
		}

		const cookieStore = await cookies();
		const pendingSetupCookie = cookieStore.get(SETUP_COOKIE_NAME)?.value;

		if (!pendingSetupCookie) {
			return NextResponse.json(
				{ message: "Setup session expired. Start again." },
				{ status: 400 }
			);
		}

		const pendingSetup = parsePendingSetup(pendingSetupCookie);

		const totpOk = verifyTotpCode({
			secretBase32: pendingSetup.totpSecretBase32,
			token: parsed.data.token,
			accountName: pendingSetup.email,
		});

		if (!totpOk) {
			return NextResponse.json(
				{ message: "Invalid TOTP code" },
				{ status: 401 }
			);
		}

		const created = await prisma.$transaction(async (tx) => {
			const existingAdmin = await tx.adminUser.findFirst({
			  select: {
			    id: true,
			  },
			});

			if (existingAdmin) {
			  throw new Error("Application is already initialized");
			}

			const user = await tx.adminUser.create({
				data: {
					email: pendingSetup.email,
					passwordHash: pendingSetup.passwordHash,
					isActive: true,
				},
			});

			await tx.adminTotp.create({
				data: {
					userId: user.id,
					secretEncrypted: encryptTotpSecret(pendingSetup.totpSecretBase32),
					isEnabled: true,
				},
			});

			await tx.auditLog.create({
				data: {
					actorUserId: user.id,
					action: "INITIAL_SETUP_COMPLETED",
					targetType: "AdminUser",
					targetId: user.id,
				},
			});

			return user;
		});

		const userAgent = req.headers.get("user-agent");
		const forwardedFor = req.headers.get("x-forwarded-for");
		const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

		const { token, expiresAt } = await createSession({
			userId: created.id,
			userAgent,
			ipAddress,
			idleTtlSeconds: 60 * 30,
		});

		const res = NextResponse.json({
			message: "Setup completed",
		});

		res.cookies.set({
			name: SETUP_COOKIE_NAME,
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
		console.error("SETUP CONFIRM ERROR:", error);
		return NextResponse.json(
			{ message: "Failed to complete setup" },
			{ status: 500 }
		);
	}
}