import { withApiSecurity } from "@/lib/api/api.guard";
import { requireAdminUser } from "@/lib/auth/auth.service";
import { getRequestMeta } from "@/lib/api/api.request";
import { badRequest } from "@/lib/api/api.response";
import { createAdminWebAuthnRegistrationOptions } from "@/lib/admin-webauthn/admin-webauthn.service";

async function handler(req: Request) {
  try {
    const user = await requireAdminUser();
    const meta = getRequestMeta(req);

    return createAdminWebAuthnRegistrationOptions({
      userId: user.id,
      userEmail: user.email,
      meta,
    });
  } catch (error) {
    console.error("WEBAUTHN REGISTER OPTIONS ERROR:", error);
    return badRequest("Failed to create WebAuthn registration options");
  }
}

export const POST = withApiSecurity(handler);