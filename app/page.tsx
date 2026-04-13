import { redirect } from "next/navigation";
import LoginForm from "@/components/forms/LoginForm";
import { isAppInitialized } from "@/lib/bootstrap";

export default async function HomePage() {
  const initialized = await isAppInitialized();

  if (!initialized) {
    redirect("/setup");
  }

  return <LoginForm />;
}