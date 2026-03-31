import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("auth")?.value;

  if (auth !== "true") {
    redirect("/");
  }

  return <DashboardClient />;
}