import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  totp: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{6}$/.test(value), {
      message: "TOTP must be empty or exactly 6 digits",
    }),
});

export type LoginFormData = z.infer<typeof loginSchema>;