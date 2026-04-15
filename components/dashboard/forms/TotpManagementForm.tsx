"use client";

import { useMemo, useState } from "react";
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
import SensitiveActionReauthDialog from "./SensitiveActionReauthDialog";

type Props = {
  isTotpEnabled: boolean;
  adminEmail: string;
};

type PendingAction = "start_setup" | "remove_totp" | null;

export default function TotpManagementForm({
  isTotpEnabled,
  adminEmail,
}: Props) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [reauthOpen, setReauthOpen] = useState(false);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secretBase32, setSecretBase32] = useState("");
  const [token, setToken] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(isTotpEnabled);

  const openReauth = (action: PendingAction) => {
    setMessage("");
    setError("");
    setPendingAction(action);
    setReauthOpen(true);
  };

  const resetSetupState = () => {
    setQrCodeDataUrl("");
    setSecretBase32("");
    setToken("");
  };

  const handleVerified = async () => {
    if (!pendingAction) return;

    setError("");
    setMessage("");
    setIsBusy(true);

    try {
      if (pendingAction === "start_setup") {
        const res = await fetch("/api/admin/totp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "start_setup",
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setError(json?.message ?? "Failed to start TOTP setup");
          return;
        }

        setQrCodeDataUrl(json?.qrCodeDataUrl ?? "");
        setSecretBase32(json?.secretBase32 ?? "");
        setMessage(
          totpEnabled
            ? "Scan the new QR code and confirm the new TOTP."
            : "Scan the QR code and confirm TOTP."
        );
        return;
      }

      if (pendingAction === "remove_totp") {
        const res = await fetch("/api/admin/totp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "remove_totp",
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setError(json?.message ?? "Failed to remove TOTP");
          return;
        }

        setTotpEnabled(false);
        resetSetupState();
        setMessage("TOTP removed successfully");
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmSetup = async () => {
    setError("");
    setMessage("");
    setIsBusy(true);

    try {
      const res = await fetch("/api/admin/totp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "confirm_setup",
          token,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message ?? "Failed to confirm TOTP setup");
        return;
      }

      setTotpEnabled(true);
      resetSetupState();
      setMessage(json?.message ?? "TOTP saved successfully");
    } finally {
      setIsBusy(false);
    }
  };

  const reauthTitle = useMemo(() => {
    if (pendingAction === "remove_totp") {
      return "Confirm TOTP removal";
    }

    if (pendingAction === "start_setup" && totpEnabled) {
      return "Confirm TOTP replacement";
    }

    return "Confirm TOTP enable";
  }, [pendingAction, totpEnabled]);

  const reauthDescription = useMemo(() => {
    if (pendingAction === "remove_totp") {
      return "To remove TOTP, enter your password, current TOTP code, and confirm with a registered security key.";
    }

    if (pendingAction === "start_setup" && totpEnabled) {
      return "To replace TOTP, enter your password, current TOTP code, and confirm with a registered security key.";
    }

    return "To enable TOTP, enter your password and confirm with a registered security key.";
  }, [pendingAction, totpEnabled]);

  const isCurrentTotpRequired =
    pendingAction === "remove_totp" ||
    (pendingAction === "start_setup" && totpEnabled);

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        TOTP Settings
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={2}>
        <Typography variant="body2">
          Admin email: <strong>{adminEmail}</strong>
        </Typography>

        <Alert severity={totpEnabled ? "success" : "warning"}>
          TOTP status: <strong>{totpEnabled ? "Enabled" : "Disabled"}</strong>
        </Alert>

        <Typography variant="body2">
          To manage TOTP, you must confirm with your password and a registered
          security key. If TOTP is currently enabled, current TOTP confirmation is
          also required.
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="contained"
            onClick={() => openReauth("start_setup")}
            disabled={isBusy}
          >
            {totpEnabled ? "Replace TOTP" : "Enable TOTP"}
          </Button>

          {totpEnabled ? (
            <Button
              variant="outlined"
              color="error"
              onClick={() => openReauth("remove_totp")}
              disabled={isBusy}
            >
              Remove TOTP
            </Button>
          ) : null}
        </Box>

        {qrCodeDataUrl ? (
          <Box
            component="img"
            src={qrCodeDataUrl}
            alt="TOTP QR Code"
            sx={{
              width: 220,
              height: 220,
              border: "1px solid #ddd",
              borderRadius: 2,
              p: 1,
              bgcolor: "#fff",
            }}
          />
        ) : null}

        {secretBase32 ? (
          <Alert severity="info">
            Backup secret: <strong>{secretBase32}</strong>
          </Alert>
        ) : null}

        {qrCodeDataUrl ? (
          <>
            <TextField
              label="6-digit TOTP code"
              value={token}
              onChange={(e) =>
                setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputProps={{ inputMode: "numeric", maxLength: 6 }}
              fullWidth
            />

            <Box>
              <Button
                variant="contained"
                onClick={handleConfirmSetup}
                disabled={isBusy || token.length !== 6}
              >
                {isBusy ? "Saving..." : "Confirm TOTP"}
              </Button>
            </Box>
          </>
        ) : null}

        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>

      <SensitiveActionReauthDialog
        open={reauthOpen}
        purpose="totp_management"
        title={reauthTitle}
        description={reauthDescription}
        totpRequired={isCurrentTotpRequired}
        onClose={() => {
          setReauthOpen(false);
          setPendingAction(null);
        }}
        onVerified={handleVerified}
      />
    </Paper>
  );
}