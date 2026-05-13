"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
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

  const [localKeyCount, setLocalKeyCount] = useState(keyCount);
  const [localCredentials, setLocalCredentials] =
    useState<CredentialItem[]>(credentials);

  const [keyName, setKeyName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegisterKey = async () => {
    setMessage("");
    setError("");
    setIsRegistering(true);

    try {
      const optionsRes = await fetch("/api/webauthn/register/options", {
        method: "POST",
      });

      const optionsJson = await optionsRes.json().catch(() => null);

      if (!optionsRes.ok || !optionsJson?.options) {
        setError(
          optionsJson?.message ?? "Failed to create registration options"
        );
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

      const nextCount = localKeyCount + 1;

      setLocalKeyCount(nextCount);
      setLocalCredentials((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: keyName || "Unnamed security key",
          createdAt: new Date().toISOString(),
        },
      ]);

      setKeyName("");
      setMessage("Security key registered successfully");

      router.refresh();

      if (nextCount >= requiredCount) {
        router.replace("/admin/dashboard");
      }
    } catch {
      setError("Security key registration was cancelled or failed");
    } finally {
      setIsRegistering(false);
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
      <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 520, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={700}>
            Register Security Keys
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Admin: <strong>{adminEmail}</strong>
          </Typography>

          <Alert severity={localKeyCount >= requiredCount ? "success" : "warning"}>
            Registered keys: <strong>{localKeyCount}</strong> /{" "}
            <strong>{requiredCount}</strong>
          </Alert>

          <TextField
            label="Security key name"
            placeholder="Example: Main YubiKey"
            value={keyName}
            onChange={(event) => setKeyName(event.target.value)}
            fullWidth
          />

          <Button
            variant="contained"
            onClick={handleRegisterKey}
            disabled={isRegistering}
          >
            {isRegistering ? "Registering..." : "Register Security Key"}
          </Button>

          {localCredentials.length > 0 ? (
            <List disablePadding>
              {localCredentials.map((credential) => (
                <ListItem
                  key={credential.id}
                  disableGutters
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    p: 2,
                    mb: 1,
                  }}
                >
                  <ListItemText
                    primary={credential.name || "Unnamed security key"}
                    secondary={`Added: ${new Date(
                      credential.createdAt
                    ).toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : null}

          {message ? <Alert severity="success">{message}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </Paper>
    </Box>
  );
}