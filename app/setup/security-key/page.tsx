import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import {
  countAdminSecurityKeys,
  doesAdminHaveMinimumSecurityKeys,
} from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import SetupSecurityKeyForm from "@/components/forms/SetupSecurityKeyForm";

const REQUIRED_SECURITY_KEYS = 2;

export default async function SetupSecurityKeyPage() {
  const user = await requireAdminUser();

  const [hasEnoughKeys, keyCount, credentials] = await Promise.all([
    doesAdminHaveMinimumSecurityKeys(user.id, REQUIRED_SECURITY_KEYS),
    countAdminSecurityKeys(user.id),
    prisma.adminWebAuthnCredential.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    }),
  ]);

  if (hasEnoughKeys) {
    redirect("/admin/dashboard");
  }

  return (
    <SetupSecurityKeyForm
      adminEmail={user.email}
      credentials={credentials.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }))}
      keyCount={keyCount}
      requiredCount={REQUIRED_SECURITY_KEYS}
    />
  );
}