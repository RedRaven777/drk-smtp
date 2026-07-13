"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  totpEnabled: boolean;
};

type PendingAction =
  | { type: "register" }
  | { type: "rename"; credentialId: string }
  | { type: "delete"; credentialId: string }
  | null;

export default function WebAuthnManagementForm({
  initialCredentials,
  minimumKeys,
  totpEnabled,
}: Props) {
  const router = useRouter();

  const [credentials, setCredentials] =
    useState<CredentialItem[]>(initialCredentials);

  const [keyName, setKeyName] = useState("");

  const [renameValues, setRenameValues] =
    useState<Record<string, string>>({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isRegistering, setIsRegistering] = useState(false);

  const [busyCredentialId, setBusyCredentialId] =
    useState<string | null>(null);

  const [reauthOpen, setReauthOpen] = useState(false);

  const [pendingAction, setPendingAction] =
    useState<PendingAction>(null);

  const [registrationAuthorized, setRegistrationAuthorized] =
    useState(false);

  useEffect(() => {
    setCredentials(initialCredentials);

    setRenameValues(
      Object.fromEntries(
        initialCredentials.map((item) => [
          item.id,
          item.name ?? "",
        ])
      )
    );
  }, [initialCredentials]);

  const refreshCredentials = async () => {
    const res = await fetch("/api/admin/webauthn", {
      method: "GET",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.credentials) {
      throw new Error(
        json?.message ?? "Failed to refresh security keys"
      );
    }

    setCredentials(json.credentials);

    setRenameValues(
      Object.fromEntries(
        json.credentials.map((item: CredentialItem) => [
          item.id,
          item.name ?? "",
        ])
      )
    );
  };

  const doRegisterKey = async () => {
    if (!registrationAuthorized) {
      setError(
        "Confirm this action with an existing security key first"
      );
      return;
    }

    if (!keyName.trim()) {
      setError("Security key name is required");
      return;
    }

    setError("");
    setMessage("");
    setIsRegistering(true);

    try {
      const optionsRes = await fetch(
        "/api/webauthn/register/options",
        {
          method: "POST",
        }
      );

      const optionsJson = await optionsRes
        .json()
        .catch(() => null);

      if (!optionsRes.ok || !optionsJson?.options) {
        setError(
          optionsJson?.message ??
            "Failed to create registration options"
        );
        return;
      }

      const attResp = await startRegistration({
        optionsJSON: optionsJson.options,
      });

      const verifyRes = await fetch(
        "/api/webauthn/register/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            response: attResp,
            name: keyName.trim(),
          }),
        }
      );

      const verifyJson = await verifyRes
        .json()
        .catch(() => null);

      if (!verifyRes.ok) {
        setError(
          verifyJson?.message ??
            "Failed to register security key"
        );
        return;
      }

      setKeyName("");
      setRegistrationAuthorized(false);
      setMessage("Security key registered successfully");

      await refreshCredentials();
    } catch (registrationError) {
      console.error(
        "SECURITY KEY REGISTRATION ERROR:",
        registrationError
      );

      if (
        registrationError instanceof DOMException &&
        registrationError.name === "InvalidStateError"
      ) {
        setError(
          "This security key is already registered. Insert a different security key."
        );
        return;
      }

      if (
        registrationError instanceof DOMException &&
        registrationError.name === "NotAllowedError"
      ) {
        setError(
          "Security key registration was cancelled or timed out"
        );
        return;
      }

      setError(
        "Security key registration was cancelled or failed"
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const doRename = async (credentialId: string) => {
    const name =
      (renameValues[credentialId] ?? "").trim();

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
        setError(
          json?.message ??
            "Failed to rename security key"
        );
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
        setError(
          json?.message ??
            "Failed to remove security key"
        );
        return;
      }

      setMessage(
        json?.message ?? "Security key removed"
      );

      if (json?.sessionRevoked) {
        await fetch("/api/logout", {
          method: "POST",
        });

        router.replace("/");
        router.refresh();
        return;
      }

      await refreshCredentials();
    } catch {
      setError("Failed to remove security key");
    } finally {
      setBusyCredentialId(null);
    }
  };

  const openReauthFor = (action: PendingAction) => {
    if (!totpEnabled) {
      setError(
        "Enable TOTP first before managing security keys"
      );
      return;
    }

    if (
      action?.type === "register" &&
      !keyName.trim()
    ) {
      setError(
        "Enter a name for the new security key first"
      );
      return;
    }

    setError("");
    setMessage("");
    setRegistrationAuthorized(false);
    setPendingAction(action);
    setReauthOpen(true);
  };

  const handleVerified = async () => {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;

    setReauthOpen(false);
    setPendingAction(null);

    if (action.type === "register") {
      setRegistrationAuthorized(true);

      setMessage(
        "Verification completed. Remove the existing security key, insert the new security key, then click Continue registration."
      );

      return;
    }

    if (action.type === "rename") {
      await doRename(action.credentialId);
      return;
    }

    if (action.type === "delete") {
      await doDelete(action.credentialId);
    }
  };

  const cancelRegistration = () => {
    setRegistrationAuthorized(false);
    setMessage("");
    setError("");
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 3,
      }}
    >
      <Typography
        variant="h6"
        fontWeight={700}
        mb={2}
      >
        YubiKey / Security Keys
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={2}>
        {!totpEnabled ? (
          <Alert severity="warning">
            TOTP must be enabled before you can add,
            rename, or remove security keys.
          </Alert>
        ) : (
          <Alert
            severity={
              credentials.length >= minimumKeys
                ? "success"
                : "warning"
            }
          >
            Registered keys:{" "}
            <strong>{credentials.length}</strong>.
            Minimum required:{" "}
            <strong>{minimumKeys}</strong>.
          </Alert>
        )}

        <Typography variant="body2">
          To add, rename, or remove a key, you must
          re-enter your password, TOTP, and confirm
          with a working registered security key.
        </Typography>

        <TextField
          label="New key name"
          placeholder="Example: Backup YubiKey"
          value={keyName}
          onChange={(event) =>
            setKeyName(event.target.value)
          }
          fullWidth
          disabled={
            !totpEnabled ||
            isRegistering ||
            registrationAuthorized
          }
        />

        {!registrationAuthorized ? (
          <Box>
            <Button
              variant="contained"
              onClick={() =>
                openReauthFor({
                  type: "register",
                })
              }
              disabled={
                isRegistering ||
                !totpEnabled ||
                !keyName.trim()
              }
            >
              Confirm New Security Key
            </Button>
          </Box>
        ) : (
          <Stack
            spacing={1.5}
            alignItems="flex-start"
          >
            <Alert severity="info">
              Remove the security key used for
              verification. Insert the new key and
              click Continue registration.
            </Alert>

            <Box
              display="flex"
              gap={1}
              flexWrap="wrap"
            >
              <Button
                variant="contained"
                onClick={doRegisterKey}
                disabled={isRegistering}
              >
                {isRegistering
                  ? "Registering..."
                  : "Continue registration"}
              </Button>

              <Button
                variant="outlined"
                onClick={cancelRegistration}
                disabled={isRegistering}
              >
                Cancel
              </Button>
            </Box>
          </Stack>
        )}

        {message ? (
          <Alert severity="success">
            {message}
          </Alert>
        ) : null}

        {error ? (
          <Alert severity="error">
            {error}
          </Alert>
        ) : null}

        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            mb={1}
          >
            Registered keys
          </Typography>

          {credentials.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
            >
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
                    border:
                      "1px solid #e5e7eb",
                    borderRadius: 2,
                    p: 2,
                    mb: 1.5,
                  }}
                >
                  <Stack spacing={1.5}>
                    <ListItemText
                      primary={
                        credential.name ||
                        "Unnamed key"
                      }
                      secondary={
                        <>
                          Added:{" "}
                          {new Date(
                            credential.createdAt
                          ).toLocaleString()}
                          <br />
                          Last used:{" "}
                          {credential.lastUsedAt
                            ? new Date(
                                credential.lastUsedAt
                              ).toLocaleString()
                            : "Never"}
                        </>
                      }
                    />

                    <TextField
                      label="Rename key"
                      value={
                        renameValues[
                          credential.id
                        ] ?? ""
                      }
                      onChange={(event) =>
                        setRenameValues(
                          (previous) => ({
                            ...previous,
                            [credential.id]:
                              event.target.value,
                          })
                        )
                      }
                      fullWidth
                      disabled={!totpEnabled}
                    />

                    <Box
                      display="flex"
                      gap={1}
                      flexWrap="wrap"
                    >
                      <Button
                        variant="outlined"
                        onClick={() =>
                          openReauthFor({
                            type: "rename",
                            credentialId:
                              credential.id,
                          })
                        }
                        disabled={
                          busyCredentialId ===
                            credential.id ||
                          !totpEnabled
                        }
                      >
                        Rename
                      </Button>

                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() =>
                          openReauthFor({
                            type: "delete",
                            credentialId:
                              credential.id,
                          })
                        }
                        disabled={
                          busyCredentialId ===
                            credential.id ||
                          !totpEnabled
                        }
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
        purpose="webauthn_management"
        title={
          pendingAction?.type === "register"
            ? "Confirm with an existing security key"
            : "Confirm security key change"
        }
        description={
          pendingAction?.type === "register"
            ? "First confirm this action with one of your already registered security keys. After verification, remove it and insert the new security key."
            : "To manage security keys, enter your password, current TOTP code, and confirm with a working registered security key."
        }
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