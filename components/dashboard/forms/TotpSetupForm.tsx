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

type Props = {
  isTotpEnabled: boolean;
  adminEmail: string;
};

export default function TotpSetupForm({
  isTotpEnabled,
  adminEmail,
}: Props) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secretBase32, setSecretBase32] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSetup = async () => {
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/totp/setup", { method: "POST" });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message ?? "Failed to start TOTP setup");
        return;
      }

      setQrCodeDataUrl(json?.qrCodeDataUrl ?? "");
      setSecretBase32(json?.secretBase32 ?? "");
    } catch {
      setError("Failed to start TOTP setup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/totp/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message ?? "Failed to confirm TOTP");
        return;
      }

      setMessage("TOTP enabled successfully. Reload the page.");
      setToken("");
    } catch {
      setError("Failed to confirm TOTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        Google Authenticator TOTP
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={2}>
        <Typography variant="body2">
          Admin account: <strong>{adminEmail}</strong>
        </Typography>

        {isTotpEnabled ? (
          <Alert severity="success">
            TOTP is already enabled for this admin account.
          </Alert>
        ) : (
          <>
            <Typography variant="body2">
              Start setup, scan the QR code with Google Authenticator, then enter
              the 6-digit code to confirm.
            </Typography>

            <Box>
              <Button
                variant="contained"
                onClick={handleStartSetup}
                disabled={isLoading}
              >
                Generate QR Code
              </Button>
            </Box>

            {qrCodeDataUrl ? (
              <Box>
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
              </Box>
            ) : null}

            {secretBase32 ? (
              <Alert severity="info">
                Backup secret: <strong>{secretBase32}</strong>
              </Alert>
            ) : null}

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
                onClick={handleConfirm}
                disabled={isLoading || token.length !== 6}
              >
                Confirm TOTP
              </Button>
            </Box>
          </>
        )}

        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </Paper>
  );
}