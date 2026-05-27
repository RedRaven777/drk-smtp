import { NextResponse } from "next/server";
import { withApiSecurity } from "@/lib/api/api.guard";
import { requireAdminUser } from "@/lib/auth/auth.service";
import { saveSmtpConfig } from "@/lib/smtp/smtp.service";
import { requireRecentSensitiveAction } from "@/lib/security/sensitive-action.service";
import { auditAction } from "@/lib/audit/audit.service";
import { getRequestMeta } from "@/lib/api/api.request";

async function handler(req: Request) {
  try {
    const user = await requireAdminUser();
    const meta = getRequestMeta(req);

    const allowed = await requireRecentSensitiveAction({
      userId: user.id,
      purpose: "smtp_secret_management",
    });

    if (!allowed) {
      return NextResponse.json(
        { message: "Fresh verification is required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);

    const key = String(body?.key ?? "").trim();
    const smtpUser = String(body?.smtpUser ?? "").trim();
    const password = String(body?.password ?? "");
    const recipient = String(body?.recipient ?? "").trim();
    const smtpHost = String(body?.smtpHost ?? "").trim();
    const smtpPort = Number(body?.smtpPort);

    const saved = await saveSmtpConfig({
      userId: user.id,
      key,
      smtpUser: smtpUser || undefined,
      password: password || undefined,
      recipient: recipient || undefined,
      smtpHost,
      smtpPort,
    });

    await auditAction({
      actorUserId: user.id,
      action: "SMTP_CONFIG_UPDATED",
      targetType: "SmtpConfig",
      targetId: saved.id,
      meta,
    });

    return NextResponse.json({
      message: "SMTP config saved successfully",
    });
  } catch (error) {
    console.error("SMTP CONFIG ERROR:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to save SMTP config",
      },
      { status: 400 }
    );
  }
}

export const POST = withApiSecurity(handler);