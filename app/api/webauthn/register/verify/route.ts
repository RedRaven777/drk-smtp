import { withApiSecurity } from "@/lib/api/api.guard";
import { requireAdminUser } from "@/lib/auth/auth.service";
import { getRequestMeta, readJsonBody } from "@/lib/api/api.request";
import { badRequest } from "@/lib/api/api.response";
import { verifyAdminWebAuthnRegistration } from "@/lib/admin-webauthn/admin-webauthn.service";

async function handler(req: Request) {
  try {
    const user = await requireAdminUser();
    const body = await readJsonBody(req);
    const meta = getRequestMeta(req);

    return verifyAdminWebAuthnRegistration({
      userId: user.id,
      body,
      meta,
    });
  } catch (error) {
    console.error("WEBAUTHN REGISTER VERIFY ERROR:", error);
    return badRequest("Failed to verify WebAuthn registration");
  }
}

export const POST = withApiSecurity(handler);