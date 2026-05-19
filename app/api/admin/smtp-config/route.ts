import { withApiSecurity } from "@/lib/api/api.guard";
import { requireAdminUser } from "@/lib/auth/auth.service";
import { requireRecentSensitiveAction } from "@/lib/security/sensitive-action.service";
import { getRequestMeta, readJsonBody } from "@/lib/api/api.request";
import { forbidden, serverError } from "@/lib/api/api.response";
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