"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import SmtpSettingsForm from "@/components/dashboard/forms/SmtpSettingsForm";
import TotpSetupForm from "@/components/dashboard/forms/TotpSetupForm";
import WebAuthnManagementForm from "@/components/dashboard/forms/WebAuthnManagementForm";
import {
  SMTP_CONFIG_KEYS,
  initialSmtpForm,
  type AdminSmtpConfigDto,
  type SmtpFormState,
} from "@/types/dashboard";

type Props = {
  isTotpEnabled: boolean;
  adminEmail: string;
  smtpConfigs: AdminSmtpConfigDto[];
  webauthnCredentials: {
    id: string;
    name: string | null;
    createdAt: string;
    lastUsedAt: string | null;
  }[];
  minimumSecurityKeys: number;
};

type SaveState = {
  loading: boolean;
  message: string;
  error: string;
};

const initialSaveState: SaveState = {
  loading: false,
  message: "",
  error: "",
};

export default function DashboardClient({
  isTotpEnabled,
  adminEmail,
  smtpConfigs,
  webauthnCredentials,
  minimumSecurityKeys,
}: Props) {
  const router = useRouter();

  const configMap = useMemo(() => {
    return Object.fromEntries(smtpConfigs.map((config) => [config.key, config]));
  }, [smtpConfigs]);

  const [careerSmtp, setCareerSmtp] = useState<SmtpFormState>({
    ...initialSmtpForm,
    user: configMap[SMTP_CONFIG_KEYS.CAREER]?.smtpUser ?? "",
    smtpHost: configMap[SMTP_CONFIG_KEYS.CAREER]?.smtpHost ?? "",
    smtpPort:
      configMap[SMTP_CONFIG_KEYS.CAREER]?.smtpPort !== null &&
      configMap[SMTP_CONFIG_KEYS.CAREER]?.smtpPort !== undefined
        ? String(configMap[SMTP_CONFIG_KEYS.CAREER].smtpPort)
        : "",
    hasPassword: configMap[SMTP_CONFIG_KEYS.CAREER]?.hasPassword ?? false,
    hasRecipient: configMap[SMTP_CONFIG_KEYS.CAREER]?.hasRecipient ?? false,
  });

  const [contactsSmtp, setContactsSmtp] = useState<SmtpFormState>({
    ...initialSmtpForm,
    user: configMap[SMTP_CONFIG_KEYS.CONTACTS]?.smtpUser ?? "",
    smtpHost: configMap[SMTP_CONFIG_KEYS.CONTACTS]?.smtpHost ?? "",
    smtpPort:
      configMap[SMTP_CONFIG_KEYS.CONTACTS]?.smtpPort !== null &&
      configMap[SMTP_CONFIG_KEYS.CONTACTS]?.smtpPort !== undefined
        ? String(configMap[SMTP_CONFIG_KEYS.CONTACTS].smtpPort)
        : "",
    hasPassword: configMap[SMTP_CONFIG_KEYS.CONTACTS]?.hasPassword ?? false,
    hasRecipient: configMap[SMTP_CONFIG_KEYS.CONTACTS]?.hasRecipient ?? false,
  });

  const [newrecipeSmtp, setNewrecipeSmtp] = useState<SmtpFormState>({
    ...initialSmtpForm,
    user: configMap[SMTP_CONFIG_KEYS.NEWRECIPE]?.smtpUser ?? "",
    smtpHost: configMap[SMTP_CONFIG_KEYS.NEWRECIPE]?.smtpHost ?? "",
    smtpPort:
      configMap[SMTP_CONFIG_KEYS.NEWRECIPE]?.smtpPort !== null &&
      configMap[SMTP_CONFIG_KEYS.NEWRECIPE]?.smtpPort !== undefined
        ? String(configMap[SMTP_CONFIG_KEYS.NEWRECIPE].smtpPort)
        : "",
    hasPassword: configMap[SMTP_CONFIG_KEYS.NEWRECIPE]?.hasPassword ?? false,
    hasRecipient: configMap[SMTP_CONFIG_KEYS.NEWRECIPE]?.hasRecipient ?? false,
  });

  const [contactsPopupSmtp, setContactsPopupSmtp] = useState<SmtpFormState>({
    ...initialSmtpForm,
    user: configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP]?.smtpUser ?? "",
    smtpHost: configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP]?.smtpHost ?? "",
    smtpPort:
      configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP]?.smtpPort !== null &&
      configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP]?.smtpPort !== undefined
        ? String(configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP].smtpPort)
        : "",
    hasPassword: configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP]?.hasPassword ?? false,
    hasRecipient: configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP]?.hasRecipient ?? false,
  });

  const [careerSave, setCareerSave] = useState<SaveState>(initialSaveState);
  const [contactsSave, setContactsSave] = useState<SaveState>(initialSaveState);
  const [newrecipeSave, setNewrecipeSave] = useState<SaveState>(initialSaveState);
  const [contactsPopupSave, setContactsPopupSave] = useState<SaveState>(initialSaveState);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  const validateBeforeSave = (values: SmtpFormState): string | null => {
    if (!values.user.trim()) return "SMTP user is required";
    if (!values.smtpHost.trim()) return "SMTP host is required";
    if (!values.smtpPort.trim()) return "SMTP port is required";

    const port = Number(values.smtpPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return "SMTP port must be an integer between 1 and 65535";
    }

    if (!values.hasPassword && !values.newPassword.trim()) {
      return "New password is required";
    }

    if (!values.hasRecipient && !values.newRecipient.trim()) {
      return "New recipient is required";
    }

    return null;
  };

  const saveConfig = async (
    values: SmtpFormState,
    key: string,
    setSaveState: React.Dispatch<React.SetStateAction<SaveState>>,
    setFormState: React.Dispatch<React.SetStateAction<SmtpFormState>>
  ) => {
    const validationError = validateBeforeSave(values);

    if (validationError) {
      setSaveState({
        loading: false,
        message: "",
        error: validationError,
      });
      return;
    }

    setSaveState({
      loading: true,
      message: "",
      error: "",
    });

    try {
      const res = await fetch("/api/admin/smtp-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key,
          smtpUser: values.user,
          currentPassword: values.currentPassword || undefined,
          newPassword: values.newPassword || undefined,
          currentRecipient: values.currentRecipient || undefined,
          newRecipient: values.newRecipient || undefined,
          smtpHost: values.smtpHost,
          smtpPort: Number(values.smtpPort),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setSaveState({
          loading: false,
          message: "",
          error: json?.message ?? "Failed to save config",
        });
        return;
      }

      setSaveState({
        loading: false,
        message: "Saved successfully",
        error: "",
      });

      setFormState((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        currentRecipient: "",
        newRecipient: "",
        hasPassword: true,
        hasRecipient: true,
      }));
    } catch {
      setSaveState({
        loading: false,
        message: "",
        error: "Failed to save config",
      });
    }
  };

  return (
    <DashboardLayout onLogout={handleLogout}>
      <TotpSetupForm isTotpEnabled={isTotpEnabled} adminEmail={adminEmail} />

      <WebAuthnManagementForm
        initialCredentials={webauthnCredentials}
        minimumKeys={minimumSecurityKeys}
      />

      <SmtpSettingsForm
        title="Career SMTP"
        values={careerSmtp}
        onChange={setCareerSmtp}
        onSubmit={() =>
          saveConfig(careerSmtp, SMTP_CONFIG_KEYS.CAREER, setCareerSave, setCareerSmtp)
        }
        isSaving={careerSave.loading}
        message={careerSave.message}
        error={careerSave.error}
      />

      <SmtpSettingsForm
        title="Contacts SMTP"
        values={contactsSmtp}
        onChange={setContactsSmtp}
        onSubmit={() =>
          saveConfig(contactsSmtp, SMTP_CONFIG_KEYS.CONTACTS, setContactsSave, setContactsSmtp)
        }
        isSaving={contactsSave.loading}
        message={contactsSave.message}
        error={contactsSave.error}
      />

      <SmtpSettingsForm
        title="Newrecipe SMTP"
        values={newrecipeSmtp}
        onChange={setNewrecipeSmtp}
        onSubmit={() =>
          saveConfig(newrecipeSmtp, SMTP_CONFIG_KEYS.NEWRECIPE, setNewrecipeSave, setNewrecipeSmtp)
        }
        isSaving={newrecipeSave.loading}
        message={newrecipeSave.message}
        error={newrecipeSave.error}
      />

      <SmtpSettingsForm
        title="Contacts Popup SMTP"
        values={contactsPopupSmtp}
        onChange={setContactsPopupSmtp}
        onSubmit={() =>
          saveConfig(
            contactsPopupSmtp,
            SMTP_CONFIG_KEYS.CONTACTS_POPUP,
            setContactsPopupSave,
            setContactsPopupSmtp
          )
        }
        isSaving={contactsPopupSave.loading}
        message={contactsPopupSave.message}
        error={contactsPopupSave.error}
      />
    </DashboardLayout>
  );
}