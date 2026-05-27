export type PublicFormSmtpKey =
  | "CAREER"
  | "CONTACTS"
  | "CONTACTS_POPUP"
  | "NEWRECIPE";

export type MailAttachment = {
  filename: string;
  content: Buffer;
};

export type SendMailParams = {
  smtpKey: PublicFormSmtpKey;
  fromName: string;
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
};