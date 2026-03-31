import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  totp: z
    .string()
    .length(6, "TOTP must be 6 digits")
    .regex(/^\d{6}$/, "TOTP must be numbers only"),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
  totp: z
    .string()
    .length(6, "TOTP must be 6 digits")
    .regex(/^\d{6}$/, "TOTP must be numbers only"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;