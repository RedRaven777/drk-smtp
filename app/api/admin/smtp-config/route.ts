import { withApiSecurity } from "@/lib/api-guard";
import { requireAdminUser } from "@/lib/auth";
import { requireRecentSensitiveAction } from "@/lib/sensitive-action";
import { getRequestMeta, readJsonBody } from "@/lib/api/request";
import { forbidden, serverError } from "@/lib/api/response";
import { saveSmtpConfig } from "@/lib/smtp/smtp.service";

async function handler(req: Request) {
  try {
    const user = await requireAdminUser();

    const allowed = await requireRecentSensitiveAction({
      userId: user.id,
      purpose: "smtp_secret_management",
    });

    if (!allowed) {
      return forbidden("Fresh verification is required");
    }

    const body = await readJsonBody(req);
    const meta = getRequestMeta(req);

    return saveSmtpConfig({
      userId: user.id,
      body,
      meta,
    });
  } catch (error) {
    console.error("SMTP CONFIG ERROR:", error);
    return serverError("Failed to save SMTP config");
  }
}

export const POST = withApiSecurity(handler);