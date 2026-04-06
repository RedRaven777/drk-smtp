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
  currentPassword: string;
  newPassword: string;
  currentRecipient: string;
  newRecipient: string;
  smtpHost: string;
  smtpPort: string;
  hasPassword: boolean;
  hasRecipient: boolean;
};

export type AdminSmtpConfigDto = {
  key: SmtpConfigKey;
  smtpUser: string;
  smtpHost: string;
  smtpPort: number | null;
  hasPassword: boolean;
  hasRecipient: boolean;
};

export const initialSmtpForm: SmtpFormState = {
  user: "",
  currentPassword: "",
  newPassword: "",
  currentRecipient: "",
  newRecipient: "",
  smtpHost: "",
  smtpPort: "",
  hasPassword: false,
  hasRecipient: false,
};