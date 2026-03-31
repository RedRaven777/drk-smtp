"use client";

import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import EmailInput from "../fields/EmailInput";
import PasswordInput from "../fields/PasswordInput";
import RecipientInput from "../fields/RecipientInput";
import type { SmtpFormState } from "@/types/dashboard";

type Props = {
  title: string;
  values: SmtpFormState;
  onChange: React.Dispatch<React.SetStateAction<SmtpFormState>>;
  onSubmit: () => void;
};

export default function SmtpSettingsForm({
  title,
  values,
  onChange,
  onSubmit,
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

        <PasswordInput
          value={values.password}
          onChange={(value) =>
            onChange((prev) => ({ ...prev, password: value }))
          }
        />

        <RecipientInput
          value={values.recipient}
          onChange={(value) =>
            onChange((prev) => ({ ...prev, recipient: value }))
          }
        />

        <Box>
          <Button variant="contained" onClick={onSubmit}>
            Save
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}