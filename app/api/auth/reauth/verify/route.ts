import { withApiSecurity } from "@/lib/api-guard";
import { getRequestMeta, readJsonBody } from "@/lib/api/request";
import { badRequest } from "@/lib/api/response";
import { verifySensitiveReauth } from "@/lib/reauth/reauth.service";

async function handler(req: Request) {
  try {
    const body = await readJsonBody(req);
    const meta = getRequestMeta(req);

    return verifySensitiveReauth({
      body,
      meta,
    });
  } catch (error) {
    console.error("SENSITIVE REAUTH VERIFY ERROR:", error);
    return badRequest("Failed to verify security key");
  }
}

export const POST = withApiSecurity(handler);