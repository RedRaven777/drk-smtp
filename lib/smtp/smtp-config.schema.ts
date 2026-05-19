import { z } from "zod";
import { SmtpConfigKey } from "@/app/generated/prisma/client";

export const smtpConfigKeySchema = z.nativeEnum(SmtpConfigKey);

export const smtpConfigSaveSchema = z.object({
  key: smtpConfigKeySchema,

  smtpUser: z
    .string()
    .trim()
    .min(1, "SMTP user is required")
    .max(320, "SMTP user is too long"),

  currentPassword: z
    .string()
    .max(500, "Current password is too long")
    .optional()
    .nullable(),

  newPassword: z
    .string()
    .max(500, "New password is too long")
    .optional()
    .nullable(),

  currentRecipient: z
    .string()
    .trim()
    .max(320, "Current recipient is too long")
    .optional()
    .nullable(),

  newRecipient: z
    .string()
    .trim()
    .email("New recipient must be a valid email")
    .max(320, "New recipient is too long")
    .optional()
    .nullable(),

  smtpHost: z
    .string()
    .trim()
    .min(1, "SMTP host is required")
    .max(255, "SMTP host is too long"),

  smtpPort: z
    .number()
    .int("SMTP port must be an integer")
    .min(1, "SMTP port must be at least 1")
    .max(65535, "SMTP port must be at most 65535"),
});