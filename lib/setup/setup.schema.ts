import { z } from "zod";

export const initialSetupStartSchema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string().min(12, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const initialSetupConfirmSchema = z.object({
  token: z
    .string()
    .trim()
    .length(6, "TOTP code must be 6 digits")
    .regex(/^\d{6}$/, "TOTP code must contain only digits"),
});

export type InitialSetupStartFormData = z.infer<typeof initialSetupStartSchema>;
export type InitialSetupConfirmFormData = z.infer<
  typeof initialSetupConfirmSchema
>;