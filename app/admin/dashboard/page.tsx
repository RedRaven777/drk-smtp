import DashboardClient from "./DashboardClient";
import { requireAdminUser } from "@/lib/auth";

export default async function DashboardPage() {
  await requireAdminUser();
  return <DashboardClient />;
}