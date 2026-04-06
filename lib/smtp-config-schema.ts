import { z } from "zod";
import { SmtpConfigKey } from "@/app/generated/prisma/client";

export const smtpConfigKeySchema = z.nativeEnum(SmtpConfigKey);

export const smtpConfigSaveSchema = z.object({
  key: smtpConfigKeySchema,

  smtpUser: z
    .string()
    .trim()
    .max(320, "SMTP user is too long")
    .optional()
    .nullable(),

  smtpPassword: z
    .string()
    .max(500, "SMTP password is too long")
    .optional()
    .nullable(),

  recipient: z
    .string()
    .trim()
    .max(320, "Recipient is too long")
    .optional()
    .nullable(),

  smtpHost: z
    .string()
    .trim()
    .max(255, "SMTP host is too long")
    .optional()
    .nullable(),

  smtpPort: z
    .number()
    .int("SMTP port must be an integer")
    .min(1, "SMTP port must be at least 1")
    .max(65535, "SMTP port must be at most 65535")
    .optional()
    .nullable(),
});