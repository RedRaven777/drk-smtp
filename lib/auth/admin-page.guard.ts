import "server-only";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/auth.service";
import { countAdminSecurityKeys } from "@/lib/bootstrap/bootstrap.service";

const REQUIRED_SECURITY_KEYS = 2;

export async function requireReadyAdminPage() {
  const user = await requireAdminUser();

  const keyCount = await countAdminSecurityKeys(user.id);

  if (keyCount < REQUIRED_SECURITY_KEYS) {
    redirect("/setup/security-key");
  }

  return {
    user,
    keyCount,
    requiredSecurityKeys: REQUIRED_SECURITY_KEYS,
  };
}