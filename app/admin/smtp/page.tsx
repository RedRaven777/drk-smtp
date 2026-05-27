import SmtpClient from "./SmtpClient";
import { requireReadyAdminPage } from "@/lib/auth/admin-page.guard";
import { getAllSmtpConfigsForAdmin } from "@/lib/smtp/smtp.service";

export default async function AdminSmtpPage() {
  await requireReadyAdminPage();

  const smtpConfigs = await getAllSmtpConfigsForAdmin();

  return <SmtpClient smtpConfigs={smtpConfigs} />;
}