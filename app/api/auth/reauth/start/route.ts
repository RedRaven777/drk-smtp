import { withApiSecurity } from "@/lib/api-guard";
import { requireAdminUser } from "@/lib/auth";
import { getRequestMeta, readJsonBody } from "@/lib/api/request";
import { badRequest } from "@/lib/api/response";
import { startSensitiveReauth } from "@/lib/reauth/reauth.service";

async function handler(req: Request) {
  try {
    const user = await requireAdminUser();
    const body = await readJsonBody(req);
    const meta = getRequestMeta(req);

    return startSensitiveReauth({
      userId: user.id,
      body,
      meta,
    });
  } catch (error) {
    console.error("SENSITIVE REAUTH START ERROR:", error);
    return badRequest("Failed to start sensitive re-auth");
  }
}

export const POST = withApiSecurity(handler);