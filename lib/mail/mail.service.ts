import "server-only";

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma/prisma.client";
import { decryptString } from "@/lib/crypto/crypto.service";

import type {
  MailAttachment,
  PublicFormSmtpKey,
  SendMailParams,
} from "@/lib/mail/mail.types";

async function createMailer(key: PublicFormSmtpKey) {
  const config = await prisma.smtpConfig.findUnique({
    where: { key },
  });

  if (!config) {
    throw new Error(`SMTP config not found: ${key}`);
  }

  if (
    !config.smtpHost ||
    !config.smtpPort ||
    !config.smtpUser ||
    !config.smtpPasswordEncrypted
  ) {
    throw new Error(`SMTP config incomplete: ${key}`);
  }

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: decryptString(config.smtpPasswordEncrypted),
    },
  });

  return {
    transporter,
    smtpUser: config.smtpUser,
    recipient: config.recipientEncrypted
      ? decryptString(config.recipientEncrypted)
      : null,
  };
}

export async function getMailerByKey(key: PublicFormSmtpKey) {
  return createMailer(key);
}

export async function buildAttachments(files: File[]): Promise<MailAttachment[]> {
  return Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
    }))
  );
}

export async function sendMail({
  smtpKey,
  fromName,
  to,
  subject,
  html,
  attachments,
}: SendMailParams) {
  const { transporter, smtpUser } = await getMailerByKey(smtpKey);

  return transporter.sendMail({
    from: `"${fromName}" <${smtpUser}>`,
    to,
    subject,
    html,
    attachments,
  });
}