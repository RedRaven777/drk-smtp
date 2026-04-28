"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import PasswordField from "@/components/forms/fields/PasswordField";
import TotpField from "@/components/forms/fields/TotpField";
import { writeAdminTabUnlock } from "@/lib/admin-unlock";

export default function AdminUnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin/dashboard";

  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async () => {
    setError("");

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    if (!/^\d{6}$/.test(totp)) {
      setError("Valid 6-digit TOTP code is required");
      return;
    }

    setIsLoading(true);

    try {
      const startRes = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unlockOnly: true,
          password,
          totp,
        }),
      });

      const startJson = await startRes.json().catch(() => null);

      if (!startRes.ok || !startJson?.options) {
        setError(startJson?.message ?? "Failed to start admin unlock");
        setIsLoading(false);
        return;
      }

      const authResp = await startAuthentication({
        optionsJSON: startJson.options,
      });

      const verifyRes = await fetch("/api/login/webauthn/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: authResp,
          unlockOnly: true,
        }),
      });

      const verifyJson = await verifyRes.json().catch(() => null);

      if (!verifyRes.ok) {
        setError(verifyJson?.message ?? "Failed to unlock admin area");
        setIsLoading(false);
        return;
      }

      writeAdminTabUnlock();
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Admin unlock was cancelled or failed");
      setIsLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f9fafb"
      px={2}
    >
      <Paper
        elevation={3}
        sx={{ p: 4, width: "100%", maxWidth: 420, borderRadius: 3 }}
      >
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={700}>
            Unlock Admin Area
          </Typography>

          <Typography variant="body2" color="text.secondary">
            To access protected admin content, confirm your password, TOTP, and
            a registered security key.
          </Typography>

          <PasswordField value={password} onChange={setPassword} />
          <TotpField value={totp} onChange={setTotp} />

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button
            variant="contained"
            onClick={handleUnlock}
            disabled={isLoading}
          >
            {isLoading ? "Unlocking..." : "Unlock"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}