"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginSchema, type LoginFormData } from "@/lib/schemas";
import EmailField from "./fields/EmailField";
import PasswordField from "./fields/PasswordField";
import TotpField from "./fields/TotpField";

export default function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", totp: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setServerError(json?.message ?? "Login failed");
      return;
    }

    router.replace("/admin/dashboard");
    router.refresh();
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        display="flex"
        flexDirection="column"
        gap={2}
        width={320}
      >
        <Typography variant="h5">Login</Typography>

        {serverError ? <Alert severity="error">{serverError}</Alert> : null}

        <Controller
          name="email"
          control={control}
          render={({ field }) => <EmailField {...field} />}
        />
        {errors.email ? (
          <Typography variant="body2" color="error">
            {errors.email.message}
          </Typography>
        ) : null}

        <Controller
          name="password"
          control={control}
          render={({ field }) => <PasswordField {...field} />}
        />
        {errors.password ? (
          <Typography variant="body2" color="error">
            {errors.password.message}
          </Typography>
        ) : null}

        <Controller
          name="totp"
          control={control}
          render={({ field }) => <TotpField {...field} />}
        />
        {errors.totp ? (
          <Typography variant="body2" color="error">
            {errors.totp.message}
          </Typography>
        ) : null}

        <Button
          variant="contained"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </Button>

        <Link href="/reset-password">Forgot password?</Link>
      </Box>
    </Box>
  );
}