export const SMTP_CONFIG_KEYS = {
  CAREER: "CAREER",
  CONTACTS: "CONTACTS",
  NEWRECIPE: "NEWRECIPE",
  CONTACTS_POPUP: "CONTACTS_POPUP",
} as const;

export type SmtpConfigKey =
  (typeof SMTP_CONFIG_KEYS)[keyof typeof SMTP_CONFIG_KEYS];

export type AdminSmtpConfigDto = {
  id: string;
  key: SmtpConfigKey;
  smtpUserMasked: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  hasPassword: boolean;
  hasRecipient: boolean;
  recipientMasked: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SmtpFormState = {
  user: string;
  smtpHost: string;
  smtpPort: string;
  password: string;
  recipient: string;
  hasPassword: boolean;
  hasRecipient: boolean;
  isConfigured: boolean;
  isEditing: boolean;
  smtpUserMasked: string | null;
  recipientMasked: string | null;
};

export const initialSmtpForm: SmtpFormState = {
  user: "",
  smtpHost: "",
  smtpPort: "",
  password: "",
  recipient: "",
  hasPassword: false,
  hasRecipient: false,
  isConfigured: false,
  isEditing: true,
  smtpUserMasked: null,
  recipientMasked: null,
};