import { withApiSecurity } from "@/lib/api-guard";
import { requireAdminUser } from "@/lib/auth";
import { getRequestMeta, readJsonBody } from "@/lib/api/request";
import { unauthorized } from "@/lib/api/response";
import {
  listAdminSecurityKeys,
  removeAdminSecurityKey,
  renameAdminSecurityKey,
} from "@/lib/admin-webauthn/admin-webauthn.service";

async function getHandler() {
  try {
    const user = await requireAdminUser();

    return listAdminSecurityKeys({
      userId: user.id,
    });
  } catch (error) {
    console.error("GET WEBAUTHN ADMIN ERROR:", error);
    return unauthorized();
  }
}

async function patchHandler(req: Request) {
  try {
    const user = await requireAdminUser();
    const body = await readJsonBody(req);
    const meta = getRequestMeta(req);

    return renameAdminSecurityKey({
      userId: user.id,
      body,
      meta,
    });
  } catch (error) {
    console.error("PATCH WEBAUTHN ADMIN ERROR:", error);
    return unauthorized();
  }
}

async function deleteHandler(req: Request) {
  try {
    const user = await requireAdminUser();
    const body = await readJsonBody(req);
    const meta = getRequestMeta(req);

    return removeAdminSecurityKey({
      userId: user.id,
      body,
      meta,
    });
  } catch (error) {
    console.error("DELETE WEBAUTHN ADMIN ERROR:", error);
    return unauthorized();
  }
}

export const GET = getHandler;
export const PATCH = withApiSecurity(patchHandler);
export const DELETE = withApiSecurity(deleteHandler);