"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import SmtpSettingsForm from "@/components/dashboard/forms/SmtpSettingsForm";
import MainSettingsForm from "@/components/dashboard/forms/MainSettingsForm";
import TotpSetupForm from "@/components/dashboard/forms/TotpSetupForm";
import {
  SMTP_CONFIG_KEYS,
  initialMainSettings,
  initialSmtpForm,
  type AdminSmtpConfigDto,
  type MainSettingsState,
  type SmtpFormState,
} from "@/types/dashboard";

type Props = {
  isTotpEnabled: boolean;
  adminEmail: string;
  smtpConfigs: AdminSmtpConfigDto[];
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
}: Props) {
  const router = useRouter();

  const configMap = useMemo(() => {
    return Object.fromEntries(smtpConfigs.map((config) => [config.key, config]));
  }, [smtpConfigs]);

  const [careerSmtp, setCareerSmtp] = useState<SmtpFormState>({
    ...initialSmtpForm,
    user: configMap[SMTP_CONFIG_KEYS.CAREER]?.smtpUser ?? "",
    recipient: configMap[SMTP_CONFIG_KEYS.CAREER]?.recipient ?? "",
    hasPassword: configMap[SMTP_CONFIG_KEYS.CAREER]?.hasPassword ?? false,
  });

  const [contactsSmtp, setContactsSmtp] = useState<SmtpFormState>({
    ...initialSmtpForm,
    user: configMap[SMTP_CONFIG_KEYS.CONTACTS]?.smtpUser ?? "",
    recipient: configMap[SMTP_CONFIG_KEYS.CONTACTS]?.recipient ?? "",
    hasPassword: configMap[SMTP_CONFIG_KEYS.CONTACTS]?.hasPassword ?? false,
  });

  const [newrecipeSmtp, setNewrecipeSmtp] = useState<SmtpFormState>({
    ...initialSmtpForm,
    user: configMap[SMTP_CONFIG_KEYS.NEWRECIPE]?.smtpUser ?? "",
    recipient: configMap[SMTP_CONFIG_KEYS.NEWRECIPE]?.recipient ?? "",
    hasPassword: configMap[SMTP_CONFIG_KEYS.NEWRECIPE]?.hasPassword ?? false,
  });

  const [contactsPopupSmtp, setContactsPopupSmtp] = useState<SmtpFormState>({
    ...initialSmtpForm,
    user: configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP]?.smtpUser ?? "",
    recipient: configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP]?.recipient ?? "",
    hasPassword: configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP]?.hasPassword ?? false,
  });

  const [mainSettings, setMainSettings] = useState<MainSettingsState>({
    ...initialMainSettings,
    smtpHost: configMap[SMTP_CONFIG_KEYS.MAIN]?.smtpHost ?? "",
    smtpPort:
      configMap[SMTP_CONFIG_KEYS.MAIN]?.smtpPort !== null &&
      configMap[SMTP_CONFIG_KEYS.MAIN]?.smtpPort !== undefined
        ? String(configMap[SMTP_CONFIG_KEYS.MAIN].smtpPort)
        : "",
  });

  const [careerSave, setCareerSave] = useState<SaveState>(initialSaveState);
  const [contactsSave, setContactsSave] = useState<SaveState>(initialSaveState);
  const [newrecipeSave, setNewrecipeSave] = useState<SaveState>(initialSaveState);
  const [contactsPopupSave, setContactsPopupSave] = useState<SaveState>(initialSaveState);
  const [mainSave, setMainSave] = useState<SaveState>(initialSaveState);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  const saveConfig = async (
    body: Record<string, unknown>,
    setSaveState: React.Dispatch<React.SetStateAction<SaveState>>,
    afterSuccess?: () => void
  ) => {
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
        body: JSON.stringify(body),
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

      afterSuccess?.();
    } catch {
      setSaveState({
        loading: false,
        message: "",
        error: "Failed to save config",
      });
    }
  };

  const handleSaveCareer = async () => {
    await saveConfig(
      {
        key: SMTP_CONFIG_KEYS.CAREER,
        smtpUser: careerSmtp.user,
        smtpPassword: careerSmtp.password || undefined,
        recipient: careerSmtp.recipient,
      },
      setCareerSave,
      () => {
        setCareerSmtp((prev) => ({
          ...prev,
          password: "",
          hasPassword: prev.hasPassword || Boolean(prev.password),
        }));
      }
    );
  };

  const handleSaveContacts = async () => {
    await saveConfig(
      {
        key: SMTP_CONFIG_KEYS.CONTACTS,
        smtpUser: contactsSmtp.user,
        smtpPassword: contactsSmtp.password || undefined,
        recipient: contactsSmtp.recipient,
      },
      setContactsSave,
      () => {
        setContactsSmtp((prev) => ({
          ...prev,
          password: "",
          hasPassword: prev.hasPassword || Boolean(prev.password),
        }));
      }
    );
  };

  const handleSaveNewrecipe = async () => {
    await saveConfig(
      {
        key: SMTP_CONFIG_KEYS.NEWRECIPE,
        smtpUser: newrecipeSmtp.user,
        smtpPassword: newrecipeSmtp.password || undefined,
        recipient: newrecipeSmtp.recipient,
      },
      setNewrecipeSave,
      () => {
        setNewrecipeSmtp((prev) => ({
          ...prev,
          password: "",
          hasPassword: prev.hasPassword || Boolean(prev.password),
        }));
      }
    );
  };

  const handleSaveContactsPopup = async () => {
    await saveConfig(
      {
        key: SMTP_CONFIG_KEYS.CONTACTS_POPUP,
        smtpUser: contactsPopupSmtp.user,
        smtpPassword: contactsPopupSmtp.password || undefined,
        recipient: contactsPopupSmtp.recipient,
      },
      setContactsPopupSave,
      () => {
        setContactsPopupSmtp((prev) => ({
          ...prev,
          password: "",
          hasPassword: prev.hasPassword || Boolean(prev.password),
        }));
      }
    );
  };

  const handleSaveMain = async () => {
    await saveConfig(
      {
        key: SMTP_CONFIG_KEYS.MAIN,
        smtpHost: mainSettings.smtpHost,
        smtpPort: mainSettings.smtpPort === "" ? null : Number(mainSettings.smtpPort),
      },
      setMainSave
    );
  };

  return (
    <DashboardLayout onLogout={handleLogout}>
      <TotpSetupForm
        isTotpEnabled={isTotpEnabled}
        adminEmail={adminEmail}
      />

      <SmtpSettingsForm
        title="Career SMTP"
        values={careerSmtp}
        onChange={setCareerSmtp}
        onSubmit={handleSaveCareer}
        isSaving={careerSave.loading}
        message={careerSave.message}
        error={careerSave.error}
      />

      <SmtpSettingsForm
        title="Contacts SMTP"
        values={contactsSmtp}
        onChange={setContactsSmtp}
        onSubmit={handleSaveContacts}
        isSaving={contactsSave.loading}
        message={contactsSave.message}
        error={contactsSave.error}
      />

      <SmtpSettingsForm
        title="Newrecipe SMTP"
        values={newrecipeSmtp}
        onChange={setNewrecipeSmtp}
        onSubmit={handleSaveNewrecipe}
        isSaving={newrecipeSave.loading}
        message={newrecipeSave.message}
        error={newrecipeSave.error}
      />

      <SmtpSettingsForm
        title="Contacts Popup SMTP"
        values={contactsPopupSmtp}
        onChange={setContactsPopupSmtp}
        onSubmit={handleSaveContactsPopup}
        isSaving={contactsPopupSave.loading}
        message={contactsPopupSave.message}
        error={contactsPopupSave.error}
      />

      <MainSettingsForm
        values={mainSettings}
        onChange={setMainSettings}
        onSubmit={handleSaveMain}
        isSaving={mainSave.loading}
        message={mainSave.message}
        error={mainSave.error}
      />
    </DashboardLayout>
  );
}