"use client";

import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import SmtpHostInput from "../fields/SmtpHostInput";
import SmtpPortInput from "../fields/SmtpPortInput";
import type { MainSettingsState } from "@/types/dashboard";

type Props = {
  values: MainSettingsState;
  onChange: React.Dispatch<React.SetStateAction<MainSettingsState>>;
  onSubmit: () => void;
};

export default function MainSettingsForm({
  values,
  onChange,
  onSubmit,
}: Props) {
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>
        Main Settings
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={2}>
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
          <Button variant="contained" onClick={onSubmit}>
            Save
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}