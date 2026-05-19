import { withApiSecurity } from "@/lib/api/api.guard";
import { requireAdminUser } from "@/lib/auth/auth.service";
import { requireRecentSensitiveAction } from "@/lib/security/sensitive-action.service";
import { getRequestMeta, readJsonBody } from "@/lib/api/api.request";
import { badRequest, forbidden, unauthorized } from "@/lib/api/api.response";
import {
  changeAdminEmail,
  changeAdminPassword,
  getAccountAction,
} from "@/lib/account/account.service";

async function handler(req: Request) {
  try {
    const user = await requireAdminUser();
    const meta = getRequestMeta(req);

    const allowed = await requireRecentSensitiveAction({
      userId: user.id,
      purpose: "account_management",
    });

    if (!allowed) {
      return forbidden("Fresh verification is required");
    }

    const body = await readJsonBody(req);
    const action = getAccountAction(body);

    if (action === "change_email") {
      return changeAdminEmail({
        userId: user.id,
        body,
        meta,
      });
    }

    if (action === "change_password") {
      return changeAdminPassword({
        userId: user.id,
        body,
        meta,
      });
    }

    return badRequest("Invalid account action");
  } catch (error) {
    console.error("ACCOUNT PATCH ERROR:", error);
    return unauthorized();
  }
}

export const PATCH = withApiSecurity(handler);