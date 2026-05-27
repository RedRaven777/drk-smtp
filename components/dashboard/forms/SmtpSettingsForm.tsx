"use client";

import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import EmailInput from "../fields/EmailInput";
import PasswordInput from "../fields/PasswordInput";
import RecipientInput from "../fields/RecipientInput";
import SmtpHostInput from "../fields/SmtpHostInput";
import SmtpPortInput from "../fields/SmtpPortInput";
import type { SmtpFormState } from "@/types/dashboard";

type Props = {
  title: string;
  values: SmtpFormState;
  onChange: React.Dispatch<React.SetStateAction<SmtpFormState>>;
  onSubmit: () => void;
  onCancelEdit: () => void;
  isSaving?: boolean;
  message?: string;
  error?: string;
};

export default function SmtpSettingsForm({
  title,
  values,
  onChange,
  onSubmit,
  onCancelEdit,
  isSaving = false,
  message = "",
  error = "",
}: Props) {
  const isConfigured = values.isConfigured;
  const isEditing = values.isEditing;

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        mb={2}
      >
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>

        {isConfigured && !isEditing ? (
          <Button
            variant="outlined"
            onClick={() =>
              onChange((prev) => ({
                ...prev,
                isEditing: true,
                user: "",
                password: "",
                recipient: "",
              }))
            }
          >
            Edit
          </Button>
        ) : null}
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {!isEditing ? (
        <Stack spacing={1.5}>
          <Typography variant="body2">
            <strong>User:</strong> {values.smtpUserMasked ?? "Not set"}
          </Typography>

          <Typography variant="body2">
            <strong>SMTP Host:</strong> {values.smtpHost || "Not set"}
          </Typography>

          <Typography variant="body2">
            <strong>SMTP Port:</strong> {values.smtpPort || "Not set"}
          </Typography>

          <Typography variant="body2">
            <strong>Password:</strong>{" "}
            {values.hasPassword ? "••••••••••••" : "Not set"}
          </Typography>

          <Typography variant="body2">
            <strong>Recipient:</strong> {values.recipientMasked ?? "Not set"}
          </Typography>

          {message ? <Alert severity="success">{message}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Box>
            <EmailInput
              label={isConfigured ? "New SMTP User (optional)" : "SMTP User"}
              value={values.user}
              onChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  user: value,
                }))
              }
            />

            {isConfigured ? (
              <Typography variant="body2" color="text.secondary" mt={0.75}>
                Current user: {values.smtpUserMasked ?? "hidden"}. Leave empty
                to keep current user.
              </Typography>
            ) : null}
          </Box>

          <SmtpHostInput
            value={values.smtpHost}
            onChange={(value) =>
              onChange((prev) => ({
                ...prev,
                smtpHost: value,
              }))
            }
          />

          <SmtpPortInput
            value={values.smtpPort}
            onChange={(value) =>
              onChange((prev) => ({
                ...prev,
                smtpPort: value,
              }))
            }
          />

          <Box>
            <PasswordInput
              label={isConfigured ? "New Password (optional)" : "Password"}
              value={values.password}
              onChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  password: value,
                }))
              }
            />

            {isConfigured ? (
              <Typography variant="body2" color="text.secondary" mt={0.75}>
                A password is already saved. Leave empty to keep it.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" mt={0.75}>
                No password saved yet. Enter the initial SMTP password.
              </Typography>
            )}
          </Box>

          <Box>
            <RecipientInput
              label={isConfigured ? "New Recipient (optional)" : "Recipient"}
              value={values.recipient}
              onChange={(value) =>
                onChange((prev) => ({
                  ...prev,
                  recipient: value,
                }))
              }
            />

            {isConfigured ? (
              <Typography variant="body2" color="text.secondary" mt={0.75}>
                Current recipient: {values.recipientMasked ?? "hidden"}. Leave
                empty to keep current recipient.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" mt={0.75}>
                No recipient saved yet. Enter the initial recipient.
              </Typography>
            )}
          </Box>

          {message ? <Alert severity="success">{message}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={onSubmit} disabled={isSaving}>
              {isSaving ? "Saving..." : isConfigured ? "Save Changes" : "Save"}
            </Button>

            {isConfigured ? (
              <Button
                variant="outlined"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
            ) : null}
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}