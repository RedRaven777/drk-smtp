"use client";

import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginSchema, type LoginFormData } from "@/lib/schemas";
import EmailField from "./fields/EmailField";
import PasswordField from "./fields/PasswordField";
import TotpField from "./fields/TotpField";

export default function LoginForm() {
  const router = useRouter();

  const { control, handleSubmit } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", totp: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.replace("/admin/dashboard");
      router.refresh();
      return;
    }

    const json = await res.json().catch(() => null);
    alert(json?.message ?? "Invalid credentials or TOTP");
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Box display="flex" flexDirection="column" gap={2} width={320}>
        <Typography variant="h5">Login</Typography>

        <Controller
          name="email"
          control={control}
          render={({ field }) => <EmailField {...field} />}
        />
        <Controller
          name="password"
          control={control}
          render={({ field }) => <PasswordField {...field} />}
        />
        <Controller
          name="totp"
          control={control}
          render={({ field }) => <TotpField {...field} />}
        />

        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          Login
        </Button>

        <Link href="/reset-password">Forgot password?</Link>
      </Box>
    </Box>
  );
}