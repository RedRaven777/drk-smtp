import { redirect } from "next/navigation";
import SecurityClient from "./SecurityClient";
import { requireAdminUser } from "@/lib/auth/auth.service";
import { prisma } from "@/lib/prisma/prisma.client";
import { countAdminSecurityKeys } from "@/lib/bootstrap/bootstrap.service";
import { listWebAuthnCredentialsForAdmin } from "@/lib/admin-webauthn/admin-webauthn.service";

const REQUIRED_SECURITY_KEYS = 2;

export default async function SecurityPage() {
  const user = await requireAdminUser();

  const keyCount = await countAdminSecurityKeys(user.id);

  if (keyCount < REQUIRED_SECURITY_KEYS) {
    redirect("/setup/security-key");
  }

  const [totpRecord, webauthnCredentials] = await Promise.all([
    prisma.adminTotp.findUnique({
      where: { userId: user.id },
    }),
    listWebAuthnCredentialsForAdmin(user.id),
  ]);

  return (
    <SecurityClient
      isTotpEnabled={Boolean(totpRecord?.isEnabled)}
      adminEmail={user.email}
      webauthnCredentials={webauthnCredentials.map((item) => ({
        id: item.id,
        name: item.name,
        createdAt: item.createdAt.toISOString(),
        lastUsedAt: item.lastUsedAt ? item.lastUsedAt.toISOString() : null,
      }))}
      minimumSecurityKeys={REQUIRED_SECURITY_KEYS}
    />
  );
}