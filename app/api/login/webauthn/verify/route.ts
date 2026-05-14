import { withApiSecurity } from "@/lib/api-guard";
import { getRequestMeta, readJsonBody } from "@/lib/api/request";
import { badRequest } from "@/lib/api/response";
import { verifyPendingWebAuthnLogin } from "@/lib/login/webauthn-login.service";

async function handler(req: Request) {
  try {
    const body = await readJsonBody(req);
    const meta = getRequestMeta(req);

    return verifyPendingWebAuthnLogin({
      body,
      meta,
    });
  } catch (error) {
    console.error("WEBAUTHN LOGIN VERIFY ERROR:", error);
    return badRequest("Failed to verify security key");
  }
}

export const POST = withApiSecurity(handler);