import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	getAllSmtpConfigsForAdmin,
	upsertSmtpConfig,
} from "@/lib/smtp-config";
import { smtpConfigSaveSchema } from "@/lib/smtp-config-schema";

export async function GET() {
	try {
		await requireAdminUser();

		const configs = await getAllSmtpConfigsForAdmin();

		return NextResponse.json({ configs });
	} catch (error) {
		console.error("GET SMTP CONFIG ERROR:", error);
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}
}

export async function POST(req: Request) {
	try {
		const user = await requireAdminUser();
		const body = await req.json();

		const parsed = smtpConfigSaveSchema.safeParse({
			...body,
			smtpPort:
				body?.smtpPort === "" || body?.smtpPort === undefined || body?.smtpPort === null
					? null
					: Number(body.smtpPort),
		});

		if (!parsed.success) {
			return NextResponse.json(
				{
					message: "Invalid input",
					errors: parsed.error.flatten(),
				},
				{ status: 400 }
			);
		}

		const saved = await upsertSmtpConfig({
			...parsed.data,
			updatedByUserId: user.id,
		});

		await prisma.auditLog.create({
			data: {
				actorUserId: user.id,
				action: "SMTP_CONFIG_UPDATED",
				targetType: "SmtpConfig",
				targetId: saved.id,
			},
		});

		return NextResponse.json({
			message: "SMTP config saved",
			config: {
				key: saved.key,
				smtpUser: saved.smtpUser ?? "",
				recipient: saved.recipient ?? "",
				smtpHost: saved.smtpHost ?? "",
				smtpPort: saved.smtpPort ?? null,
				hasPassword: Boolean(saved.smtpPasswordEncrypted),
			},
		});
	} catch (error) {
		console.error("SAVE SMTP CONFIG ERROR:", error);
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}
}