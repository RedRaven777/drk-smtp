import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { requireAdminUser } from "@/lib/auth/auth.service";
import { getAllSmtpConfigsForAdmin } from "@/lib/smtp/smtp.service";
import { countAdminSecurityKeys } from "@/lib/bootstrap/bootstrap.service";

const REQUIRED_SECURITY_KEYS = 2;

export default async function DashboardPage() {
  const user = await requireAdminUser();

  const keyCount = await countAdminSecurityKeys(user.id);

  if (keyCount < REQUIRED_SECURITY_KEYS) {
    redirect("/setup/security-key");
  }

  const smtpConfigs = await getAllSmtpConfigsForAdmin();

  return <DashboardClient smtpConfigs={smtpConfigs} />;
}