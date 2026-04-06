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
  isSaving?: boolean;
  message?: string;
  error?: string;
};

export default function SmtpSettingsForm({
  title,
  values,
  onChange,
  onSubmit,
  isSaving = false,
  message = "",
  error = "",
}: Props) {
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        {title}
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={2}>
        <EmailInput
          label="User"
          value={values.user}
          onChange={(value) =>
            onChange((prev) => ({ ...prev, user: value }))
          }
        />

        <SmtpHostInput
          value={values.smtpHost}
          onChange={(value) =>
            onChange((prev) => ({ ...prev, smtpHost: value }))
          }
        />

        <SmtpPortInput
          value={values.smtpPort}
          onChange={(value) =>
            onChange((prev) => ({ ...prev, smtpPort: value }))
          }
        />

        <Box>
          <PasswordInput
            label="Current Password"
            value={values.currentPassword}
            onChange={(value) =>
              onChange((prev) => ({ ...prev, currentPassword: value }))
            }
          />
          {values.hasPassword ? (
            <Typography variant="body2" color="text.secondary" mt={0.75}>
              To change the saved password, enter the current password first.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" mt={0.75}>
              No password saved yet. You can set it below.
            </Typography>
          )}
        </Box>

        <PasswordInput
          label="New Password"
          value={values.newPassword}
          onChange={(value) =>
            onChange((prev) => ({ ...prev, newPassword: value }))
          }
        />

        <Box>
          <RecipientInput
            label="Current Recipient"
            value={values.currentRecipient}
            onChange={(value) =>
              onChange((prev) => ({ ...prev, currentRecipient: value }))
            }
          />
          {values.hasRecipient ? (
            <Typography variant="body2" color="text.secondary" mt={0.75}>
              Recipient is hidden. To change it, enter the current recipient first.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" mt={0.75}>
              No recipient saved yet. You can set it below.
            </Typography>
          )}
        </Box>

        <RecipientInput
          label="New Recipient"
          value={values.newRecipient}
          onChange={(value) =>
            onChange((prev) => ({ ...prev, newRecipient: value }))
          }
        />

        {message ? <Alert severity="success">{message}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Box>
          <Button variant="contained" onClick={onSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}