export const SMTP_CONFIG_KEYS = {
  CAREER: "CAREER",
  CONTACTS: "CONTACTS",
  NEWRECIPE: "NEWRECIPE",
  CONTACTS_POPUP: "CONTACTS_POPUP",
  MAIN: "MAIN",
} as const;

export type SmtpConfigKey =
  (typeof SMTP_CONFIG_KEYS)[keyof typeof SMTP_CONFIG_KEYS];

export type SmtpFormState = {
  user: string;
  password: string;
  recipient: string;
  hasPassword?: boolean;
};

export type MainSettingsState = {
  smtpHost: string;
  smtpPort: string;
  hasPassword?: boolean;
};

export type AdminSmtpConfigDto = {
  key: SmtpConfigKey;
  smtpUser: string;
  recipient: string;
  smtpHost: string;
  smtpPort: number | null;
  hasPassword: boolean;
};

export const initialSmtpForm: SmtpFormState = {
  user: "",
  password: "",
  recipient: "",
  hasPassword: false,
};

export const initialMainSettings: MainSettingsState = {
  smtpHost: "",
  smtpPort: "",
  hasPassword: false,
};