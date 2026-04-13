import DashboardClient from "./DashboardClient";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSmtpConfigsForAdmin } from "@/lib/smtp-config";

export default async function DashboardPage() {
  const user = await requireAdminUser();

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
