import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAllSmtpConfigsForAdmin,
  saveSmtpConfigSecure,
  SmtpConfigValidationError,
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
          ? NaN
          : Number(body.smtpPort),
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        fieldErrors.smtpUser?.[0] ||
        fieldErrors.smtpHost?.[0] ||
        fieldErrors.smtpPort?.[0] ||
        fieldErrors.newRecipient?.[0] ||
        fieldErrors.newPassword?.[0] ||
        "Invalid input";

      return NextResponse.json(
        {
          message: firstError,
          errors: fieldErrors,
        },
        { status: 400 }
      );
    }

    const saved = await saveSmtpConfigSecure({
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
        smtpHost: saved.smtpHost ?? "",
        smtpPort: saved.smtpPort ?? null,
        hasPassword: Boolean(saved.smtpPasswordEncrypted),
        hasRecipient: Boolean(saved.recipientEncrypted),
      },
    });
  } catch (error) {
    if (error instanceof SmtpConfigValidationError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 }
      );
    }

    console.error("SAVE SMTP CONFIG ERROR:", error);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}