import SecurityClient from "./SecurityClient";
import { prisma } from "@/lib/prisma/prisma.client";
import { requireReadyAdminPage } from "@/lib/auth/admin-page.guard";
import { listWebAuthnCredentialsForAdmin } from "@/lib/admin-webauthn/admin-webauthn.service";

export default async function SecurityPage() {
  const { user, requiredSecurityKeys } = await requireReadyAdminPage();

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
      minimumSecurityKeys={requiredSecurityKeys}
    />
  );
}