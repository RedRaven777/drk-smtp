"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";
import { startAuthentication } from "@simplewebauthn/browser";
import PasswordField from "@/components/forms/fields/PasswordField";
import TotpField from "@/components/forms/fields/TotpField";

type Props = {
  open: boolean;
  onClose: () => void;
  onVerified: () => Promise<void> | void;
};

export default function SensitiveActionReauthDialog({
  open,
  onClose,
  onVerified,
}: Props) {
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetState = () => {
    setPassword("");
    setTotp("");
    setError("");
    setIsLoading(false);
  };

  const handleClose = () => {
    if (isLoading) return;
    resetState();
    onClose();
  };

  const handleVerify = async () => {
    setError("");
    setIsLoading(true);

    try {
      const startRes = await fetch("/api/auth/reauth/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          totp,
          purpose: "webauthn_management",
        }),
      });

      const startJson = await startRes.json().catch(() => null);

      if (!startRes.ok || !startJson?.options) {
        setError(startJson?.message ?? "Failed to start verification");
        setIsLoading(false);
        return;
      }

      const authResp = await startAuthentication({
        optionsJSON: startJson.options,
      });

      const verifyRes = await fetch("/api/auth/reauth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: authResp,
        }),
      });

      const verifyJson = await verifyRes.json().catch(() => null);

      if (!verifyRes.ok) {
        setError(verifyJson?.message ?? "Failed to verify security key");
        setIsLoading(false);
        return;
      }

      await onVerified();
      resetState();
      onClose();
    } catch {
      setError("Verification was cancelled or failed");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Confirm sensitive action</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <PasswordField value={password} onChange={setPassword} />
          <TotpField value={totp} onChange={setTotp} />

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box>
            To continue, enter your password, TOTP code, and confirm with a registered
            security key.
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleVerify} variant="contained" disabled={isLoading}>
          {isLoading ? "Verifying..." : "Verify and continue"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}