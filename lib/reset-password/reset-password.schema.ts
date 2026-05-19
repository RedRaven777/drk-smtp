import { z } from "zod";

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
  totp: z
    .string()
    .length(6, "TOTP must be 6 digits")
    .regex(/^\d{6}$/, "TOTP must be numbers only"),
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;