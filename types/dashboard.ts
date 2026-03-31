export type SmtpFormState = {
  user: string;
  password: string;
  recipient: string;
};

export type MainSettingsState = {
  smtpHost: string;
  smtpPort: string;
};

export const initialSmtpForm: SmtpFormState = {
  user: "",
  password: "",
  recipient: "",
};

export const initialMainSettings: MainSettingsState = {
  smtpHost: "",
  smtpPort: "",
};