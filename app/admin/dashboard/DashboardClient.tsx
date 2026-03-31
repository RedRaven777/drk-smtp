"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import SmtpSettingsForm from "@/components/dashboard/forms/SmtpSettingsForm";
import MainSettingsForm from "@/components/dashboard/forms/MainSettingsForm";
import {
  initialMainSettings,
  initialSmtpForm,
  type MainSettingsState,
  type SmtpFormState,
} from "@/types/dashboard";

export default function DashboardClient() {
  const router = useRouter();

  const [careerSmtp, setCareerSmtp] = useState<SmtpFormState>(initialSmtpForm);
  const [contactsSmtp, setContactsSmtp] = useState<SmtpFormState>(initialSmtpForm);
  const [newrecipeSmtp, setNewrecipeSmtp] = useState<SmtpFormState>(initialSmtpForm);
  const [contactsPopupSmtp, setContactsPopupSmtp] =
    useState<SmtpFormState>(initialSmtpForm);

  const [mainSettings, setMainSettings] =
    useState<MainSettingsState>(initialMainSettings);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  const handleSubmitSmtp = (title: string, data: SmtpFormState) => {
    console.log(`${title} submitted`, data);
    alert(`${title} saved`);
  };

  const handleSubmitMainSettings = (data: MainSettingsState) => {
    console.log("Main settings submitted", data);
    alert("Main settings saved");
  };

  return (
    <DashboardLayout onLogout={handleLogout}>
      <SmtpSettingsForm
        title="Career SMTP"
        values={careerSmtp}
        onChange={setCareerSmtp}
        onSubmit={() => handleSubmitSmtp("Career SMTP", careerSmtp)}
      />

      <SmtpSettingsForm
        title="Contacts SMTP"
        values={contactsSmtp}
        onChange={setContactsSmtp}
        onSubmit={() => handleSubmitSmtp("Contacts SMTP", contactsSmtp)}
      />

      <SmtpSettingsForm
        title="Newrecipe SMTP"
        values={newrecipeSmtp}
        onChange={setNewrecipeSmtp}
        onSubmit={() => handleSubmitSmtp("Newrecipe SMTP", newrecipeSmtp)}
      />

      <SmtpSettingsForm
        title="Contacts Popup SMTP"
        values={contactsPopupSmtp}
        onChange={setContactsPopupSmtp}
        onSubmit={() =>
          handleSubmitSmtp("Contacts Popup SMTP", contactsPopupSmtp)
        }
      />

      <MainSettingsForm
        values={mainSettings}
        onChange={setMainSettings}
        onSubmit={() => handleSubmitMainSettings(mainSettings)}
      />
    </DashboardLayout>
  );
}