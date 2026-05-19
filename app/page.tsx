import { redirect } from "next/navigation";
import LoginForm from "@/components/forms/LoginForm";
import { isAppInitialized } from "@/lib/bootstrap/bootstrap.service";
import { prisma } from "@/lib/prisma/prisma.client";

export default async function HomePage() {
  const initialized = await isAppInitialized();

  if (!initialized) {
    redirect("/setup");
  }

  const admin = await prisma.adminUser.findFirst({
    include: {
      totp: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return (
    <LoginForm
      isTotpEnabled={Boolean(admin?.totp?.isEnabled)}
    />
  );
}