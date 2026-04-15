"use client";

import { useRouter } from "next/navigation";
import AdminShell from "@/components/dashboard/layout/AdminShell";
import WebAuthnManagementForm from "@/components/dashboard/forms/WebAuthnManagementForm";
import AccountSettingsForm from "@/components/dashboard/forms/AccountSettingsForm";
import TotpManagementForm from "@/components/dashboard/forms/TotpManagementForm";

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
      <AccountSettingsForm
        currentEmail={adminEmail}
        totpEnabled={isTotpEnabled}
      />

      <TotpManagementForm
        isTotpEnabled={isTotpEnabled}
        adminEmail={adminEmail}
      />

      <WebAuthnManagementForm
        initialCredentials={webauthnCredentials}
        minimumKeys={minimumSecurityKeys}
        totpEnabled={isTotpEnabled}
      />
    </AdminShell>
  );
}