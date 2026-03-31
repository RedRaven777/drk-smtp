"use client";

import { Box, Stack, Typography } from "@mui/material";

type Props = {
  children: React.ReactNode;
};

export default function DashboardContent({ children }: Props) {
  return (
    <Box
      component="main"
      sx={{
        marginLeft: "260px",
        width: "100%",
        height: "100vh",
        overflowY: "auto",
        bgcolor: "#f7f7f7",
        p: 4,
      }}
    >
      <Typography variant="h4" fontWeight={700} mb={3}>
        SMTP Settings
      </Typography>

      <Stack spacing={3}>{children}</Stack>
    </Box>
  );
}