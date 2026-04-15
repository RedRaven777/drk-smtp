"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import SensitiveActionReauthDialog from "./SensitiveActionReauthDialog";

type Props = {
  currentEmail: string;
  totpEnabled: boolean;
};

type PendingAction =
  | { type: "change_email" }
  | { type: "change_password" }
  | null;

export default function AccountSettingsForm({
  currentEmail,
  totpEnabled,
}: Props) {
  const router = useRouter();

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const openReauth = (action: PendingAction) => {
    if (!totpEnabled) {
      setError("Enable TOTP first before changing email or password");
      return;
    }

    setMessage("");
    setError("");
    setPendingAction(action);
    setReauthOpen(true);
  };

  const handleVerified = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === "change_email") {
      const email = newEmail.trim().toLowerCase();

      if (!email) {
        setError("New email is required");
        return;
      }

      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "change_email",
          newEmail: email,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message ?? "Failed to update email");
        return;
      }

      setMessage("Email updated successfully");
      setNewEmail("");
      router.refresh();
      return;
    }

    if (pendingAction.type === "change_password") {
      if (!newPassword || newPassword.length < 12) {
        setError("New password must be at least 12 characters");
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "change_password",
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message ?? "Failed to update password");
        return;
      }

      setMessage("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        Account Settings
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={3}>
        {!totpEnabled ? (
          <Alert severity="warning">
            TOTP must be enabled before you can change email or password.
          </Alert>
        ) : null}

        <Box>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>
            Change email
          </Typography>

          <Typography variant="body2" color="text.secondary" mb={1.5}>
            Current email: <strong>{currentEmail}</strong>
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="New email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              fullWidth
              disabled={!totpEnabled}
            />

            <Box>
              <Button
                variant="contained"
                onClick={() => openReauth({ type: "change_email" })}
                disabled={!totpEnabled}
              >
                Update email
              </Button>
            </Box>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>
            Change password
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              disabled={!totpEnabled}
            />

            <TextField
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              disabled={!totpEnabled}
            />

            <Box>
              <Button
                variant="contained"
                onClick={() => openReauth({ type: "change_password" })}
                disabled={!totpEnabled}
              >
                Update password
              </Button>
            </Box>
          </Stack>
        </Box>

        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>

      <SensitiveActionReauthDialog
        open={reauthOpen}
        purpose="account_management"
        title="Confirm account change"
        description="To change your email or password, enter your password, current TOTP code, and confirm with a registered security key."
        totpRequired
        onClose={() => {
          setReauthOpen(false);
          setPendingAction(null);
        }}
        onVerified={handleVerified}
      />
    </Paper>
  );
}