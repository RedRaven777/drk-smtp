"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

type CredentialItem = {
  id: string;
  name: string | null;
  createdAt: string;
};

type Props = {
  adminEmail: string;
  credentials: CredentialItem[];
  keyCount: number;
  requiredCount: number;
};

export default function SetupSecurityKeyForm({
  adminEmail,
  credentials,
  keyCount,
  requiredCount,
}: Props) {
  const router = useRouter();
  const [keyName, setKeyName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegisterKey = async () => {
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const optionsRes = await fetch("/api/webauthn/register/options", {
        method: "POST",
      });

      const optionsJson = await optionsRes.json().catch(() => null);

      if (!optionsRes.ok || !optionsJson?.options) {
        setError(optionsJson?.message ?? "Failed to create registration options");
        return;
      }

      const attResp = await startRegistration({
        optionsJSON: optionsJson.options,
      });

      const verifyRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: attResp,
          name: keyName,
        }),
      });

      const verifyJson = await verifyRes.json().catch(() => null);

      if (!verifyRes.ok) {
        setError(verifyJson?.message ?? "Failed to register security key");
        return;
      }

      setMessage("Security key registered successfully");
      setKeyName("");
      router.refresh();
    } catch {
      setError("Security key registration was cancelled or failed");
    } finally {
      setIsLoading(false);
    }
  };

  const keysRemaining = Math.max(0, requiredCount - keyCount);

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f7f7f7"
      px={2}
    >
      <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 520, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={700}>
            Security Key Setup
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Register {requiredCount} YubiKeys before accessing the dashboard.
          </Typography>

          <Typography variant="body2">
            Admin email: <strong>{adminEmail}</strong>
          </Typography>

          <Alert severity={keysRemaining > 0 ? "warning" : "success"}>
            Registered keys: <strong>{keyCount}</strong> / {requiredCount}
          </Alert>

          {message ? <Alert severity="success">{message}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label="Key name"
            placeholder={
              keyCount === 0 ? "Example: Primary YubiKey" : "Example: Backup YubiKey"
            }
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            fullWidth
          />

          <Button
            variant="contained"
            onClick={handleRegisterKey}
            disabled={isLoading}
          >
            {isLoading ? "Registering..." : "Register Security Key"}
          </Button>

          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Registered keys
            </Typography>

            {credentials.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No security keys registered yet.
              </Typography>
            ) : (
              <List disablePadding>
                {credentials.map((credential) => (
                  <ListItem key={credential.id} disableGutters>
                    <ListItemText
                      primary={credential.name || "Unnamed key"}
                      secondary={`Added: ${new Date(credential.createdAt).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}