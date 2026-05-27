import DashboardClient from "./DashboardClient";
import { requireReadyAdminPage } from "@/lib/auth/admin-page.guard";

export default async function DashboardPage() {
  await requireReadyAdminPage();

  return <DashboardClient />;
}