import { withApiSecurity } from "@/lib/api/api.guard";
import { getRequestMeta, readJsonBody } from "@/lib/api/api.request";
import { badRequest } from "@/lib/api/api.response";
import { handleAdminLogin, handleAdminUnlock } from "@/lib/login/login.service";

async function handler(req: Request) {
  try {
    const body = await readJsonBody(req);
    const meta = getRequestMeta(req);
    const unlockOnly = Boolean((body as Record<string, unknown> | null)?.unlockOnly);

    if (unlockOnly) {
      return handleAdminUnlock({
        body,
        meta,
      });
    }

    return handleAdminLogin({
      body,
      meta,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return badRequest();
  }
}

export const POST = withApiSecurity(handler);