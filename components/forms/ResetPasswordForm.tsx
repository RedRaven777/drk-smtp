"use client";

import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/schemas";
import EmailField from "./fields/EmailField";
import TotpField from "./fields/TotpField";

export default function ResetPasswordForm() {
  const { control, handleSubmit } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "", totp: "" },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => null);
    alert(json?.message ?? "Something went wrong");
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Box display="flex" flexDirection="column" gap={2} width={320}>
        <Typography variant="h5">Reset Password</Typography>

        <Controller
          name="email"
          control={control}
          render={({ field }) => <EmailField {...field} />}
        />
        <Controller
          name="totp"
          control={control}
          render={({ field }) => <TotpField {...field} />}
        />

        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          Send Reset Link
        </Button>

        <Link href="/">Back to login</Link>
      </Box>
    </Box>
  );
}