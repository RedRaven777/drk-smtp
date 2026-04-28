import AdminUnlockForm from "@/components/forms/AdminUnlockForm";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminUnlockPage() {
  await requireAdminUser();
  return <AdminUnlockForm />;
}