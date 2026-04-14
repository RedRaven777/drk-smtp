"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { startRegistration } from "@simplewebauthn/browser";
import SensitiveActionReauthDialog from "./SensitiveActionReauthDialog";

type CredentialItem = {
  id: string;
  name: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

type Props = {
  initialCredentials: CredentialItem[];
  minimumKeys: number;
};

type PendingAction =
  | { type: "register" }
  | { type: "rename"; credentialId: string }
  | { type: "delete"; credentialId: string }
  | null;

export default function WebAuthnManagementForm({
  initialCredentials,
  minimumKeys,
}: Props) {
  const [credentials, setCredentials] =
    useState<CredentialItem[]>(initialCredentials);
  const [keyName, setKeyName] = useState("");
  const [renameValues, setRenameValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [busyCredentialId, setBusyCredentialId] = useState<string | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    setCredentials(initialCredentials);
    setRenameValues(
      Object.fromEntries(
        initialCredentials.map((item) => [item.id, item.name ?? ""])
      )
    );
  }, [initialCredentials]);

  const refreshCredentials = async () => {
    const res = await fetch("/api/admin/webauthn", {
      method: "GET",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.credentials) {
      throw new Error(json?.message ?? "Failed to refresh security keys");
    }

    setCredentials(json.credentials);
    setRenameValues(
      Object.fromEntries(
        json.credentials.map((item: CredentialItem) => [item.id, item.name ?? ""])
      )
    );
  };

  const doRegisterKey = async () => {
    setError("");
    setMessage("");
    setIsRegistering(true);

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

      setKeyName("");
      setMessage("Security key registered successfully");
      await refreshCredentials();
    } catch {
      setError("Security key registration was cancelled or failed");
    } finally {
      setIsRegistering(false);
    }
  };

  const doRename = async (credentialId: string) => {
    const name = (renameValues[credentialId] ?? "").trim();

    if (!name) {
      setError("Key name is required");
      return;
    }

    setError("");
    setMessage("");
    setBusyCredentialId(credentialId);

    try {
      const res = await fetch("/api/admin/webauthn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentialId,
          name,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message ?? "Failed to rename security key");
        return;
      }

      setMessage("Security key renamed");
      await refreshCredentials();
    } catch {
      setError("Failed to rename security key");
    } finally {
      setBusyCredentialId(null);
    }
  };

  const doDelete = async (credentialId: string) => {
    setError("");
    setMessage("");
    setBusyCredentialId(credentialId);

    try {
      const res = await fetch("/api/admin/webauthn", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentialId,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message ?? "Failed to remove security key");
        return;
      }

      setMessage("Security key removed");
      await refreshCredentials();
    } catch {
      setError("Failed to remove security key");
    } finally {
      setBusyCredentialId(null);
    }
  };

  const openReauthFor = (action: PendingAction) => {
    setPendingAction(action);
    setReauthOpen(true);
  };

  const handleVerified = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === "register") {
      await doRegisterKey();
      return;
    }

    if (pendingAction.type === "rename") {
      await doRename(pendingAction.credentialId);
      return;
    }

    if (pendingAction.type === "delete") {
      await doDelete(pendingAction.credentialId);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        YubiKey / Security Keys
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={2}>
        <Alert severity={credentials.length >= minimumKeys ? "success" : "warning"}>
          Registered keys: <strong>{credentials.length}</strong>. Minimum required:{" "}
          <strong>{minimumKeys}</strong>.
        </Alert>

        <Typography variant="body2">
          To add, rename, or remove a key, you must re-enter your password, TOTP,
          and confirm with a working security key.
        </Typography>

        <TextField
          label="New key name"
          placeholder="Example: Backup YubiKey"
          value={keyName}
          onChange={(e) => setKeyName(e.target.value)}
          fullWidth
        />

        <Box>
          <Button
            variant="contained"
            onClick={() => openReauthFor({ type: "register" })}
            disabled={isRegistering}
          >
            {isRegistering ? "Registering..." : "Register New Security Key"}
          </Button>
        </Box>

        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

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
                <ListItem
                  key={credential.id}
                  disableGutters
                  sx={{
                    display: "block",
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    p: 2,
                    mb: 1.5,
                  }}
                >
                  <Stack spacing={1.5}>
                    <ListItemText
                      primary={credential.name || "Unnamed key"}
                      secondary={
                        <>
                          Added: {new Date(credential.createdAt).toLocaleString()}
                          <br />
                          Last used:{" "}
                          {credential.lastUsedAt
                            ? new Date(credential.lastUsedAt).toLocaleString()
                            : "Never"}
                        </>
                      }
                    />

                    <TextField
                      label="Rename key"
                      value={renameValues[credential.id] ?? ""}
                      onChange={(e) =>
                        setRenameValues((prev) => ({
                          ...prev,
                          [credential.id]: e.target.value,
                        }))
                      }
                      fullWidth
                    />

                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Button
                        variant="outlined"
                        onClick={() =>
                          openReauthFor({
                            type: "rename",
                            credentialId: credential.id,
                          })
                        }
                        disabled={busyCredentialId === credential.id}
                      >
                        Rename
                      </Button>

                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() =>
                          openReauthFor({
                            type: "delete",
                            credentialId: credential.id,
                          })
                        }
                        disabled={busyCredentialId === credential.id}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Stack>

      <SensitiveActionReauthDialog
        open={reauthOpen}
        onClose={() => {
          setReauthOpen(false);
          setPendingAction(null);
        }}
        onVerified={handleVerified}
      />
    </Paper>
  );
}