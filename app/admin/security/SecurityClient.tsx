"use client";

import { useRouter } from "next/navigation";
import AdminShell from "@/components/dashboard/layout/AdminShell";
import TotpSetupForm from "@/components/dashboard/forms/TotpSetupForm";
import WebAuthnManagementForm from "@/components/dashboard/forms/WebAuthnManagementForm";

type Props = {
  isTotpEnabled: boolean;
  adminEmail: string;
  webauthnCredentials: {
    id: string;
    name: string | null;
    createdAt: string;
    lastUsedAt: string | null;
  }[];
  minimumSecurityKeys: number;
};

export default function SecurityClient({
  isTotpEnabled,
  adminEmail,
  webauthnCredentials,
  minimumSecurityKeys,
}: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  return (
    <AdminShell onLogout={handleLogout}>
      <TotpSetupForm isTotpEnabled={isTotpEnabled} adminEmail={adminEmail} />

      <WebAuthnManagementForm
        initialCredentials={webauthnCredentials}
        minimumKeys={minimumSecurityKeys}
      />
    </AdminShell>
  );
}