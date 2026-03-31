"use client";

import { Box, Button, Typography } from "@mui/material";

type Props = {
  onLogout: () => void;
};

export default function DashboardSidebar({ onLogout }: Props) {
  return (
    <Box
      component="aside"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 260,
        height: "100vh",
        bgcolor: "#111827",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        px: 3,
        py: 4,
        borderRight: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Dashboard
        </Typography>
      </Box>

      <Button
        variant="contained"
        color="error"
        fullWidth
        onClick={onLogout}
      >
        Logout
      </Button>
    </Box>
  );
}