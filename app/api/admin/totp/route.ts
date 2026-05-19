import { withApiSecurity } from "@/lib/api/api.guard";
import { requireAdminUser } from "@/lib/auth/auth.service";
import { requireRecentSensitiveAction } from "@/lib/security/sensitive-action.service";
import { getRequestMeta, readJsonBody } from "@/lib/api/api.request";
import { badRequest, forbidden, unauthorized } from "@/lib/api/api.response";
import {
  confirmAdminTotpSetup,
  getTotpAction,
  removeAdminTotp,
  startAdminTotpSetup,
} from "@/lib/admin-totp/admin-totp.service";

async function handler(req: Request) {
  try {
    const user = await requireAdminUser();

    const allowed = await requireRecentSensitiveAction({
      userId: user.id,
      purpose: "totp_management",
    });

    if (!allowed) {
      return forbidden("Fresh verification is required");
    }

    const body = await readJsonBody(req);
    const meta = getRequestMeta(req);
    const action = getTotpAction(body);

    if (action === "start_setup") {
      return startAdminTotpSetup({
        userId: user.id,
        userEmail: user.email,
      });
    }

    if (action === "confirm_setup") {
      return confirmAdminTotpSetup({
        userId: user.id,
        userEmail: user.email,
        body,
        meta,
      });
    }

    if (action === "remove_totp") {
      return removeAdminTotp({
        userId: user.id,
        meta,
      });
    }

    return badRequest("Invalid TOTP action");
  } catch (error) {
    console.error("ADMIN TOTP ERROR:", error);
    return unauthorized();
  }
}

export const POST = withApiSecurity(handler);