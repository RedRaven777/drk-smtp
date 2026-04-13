import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSmtpConfigsForAdmin } from "@/lib/smtp-config";
import { doesAdminHaveMinimumSecurityKeys } from "@/lib/bootstrap";

const REQUIRED_SECURITY_KEYS = 2;

export default async function DashboardPage() {
  const user = await requireAdminUser();

  const hasEnoughKeys = await doesAdminHaveMinimumSecurityKeys(
    user.id,
    REQUIRED_SECURITY_KEYS
  );

  if (!hasEnoughKeys) {
    redirect("/setup/security-key");
  }

  const [totpRecord, smtpConfigs] = await Promise.all([
    prisma.adminTotp.findUnique({
      where: { userId: user.id },
    }),
    getAllSmtpConfigsForAdmin(),
  ]);

  return (
    <DashboardClient
      isTotpEnabled={Boolean(totpRecord?.isEnabled)}
      adminEmail={user.email}
      smtpConfigs={smtpConfigs}
    />
  );
}