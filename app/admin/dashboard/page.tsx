import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSmtpConfigsForAdmin } from "@/lib/smtp-config";
import { countAdminSecurityKeys } from "@/lib/bootstrap";
import { listWebAuthnCredentialsForAdmin } from "@/lib/webauthn-admin";

const REQUIRED_SECURITY_KEYS = 2;

export default async function DashboardPage() {
  const user = await requireAdminUser();

  const keyCount = await countAdminSecurityKeys(user.id);

  if (keyCount < REQUIRED_SECURITY_KEYS) {
    redirect("/setup/security-key");
  }

  const [totpRecord, smtpConfigs, webauthnCredentials] = await Promise.all([
    prisma.adminTotp.findUnique({
      where: { userId: user.id },
    }),
    getAllSmtpConfigsForAdmin(),
    listWebAuthnCredentialsForAdmin(user.id),
  ]);

  return (
    <DashboardClient
      isTotpEnabled={Boolean(totpRecord?.isEnabled)}
      adminEmail={user.email}
      smtpConfigs={smtpConfigs}
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