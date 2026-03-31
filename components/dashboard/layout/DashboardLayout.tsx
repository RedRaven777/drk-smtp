"use client";

import { Box } from "@mui/material";
import DashboardSidebar from "./DashboardSidebar";
import DashboardContent from "./DashboardContent";

type Props = {
  onLogout: () => void;
  children: React.ReactNode;
};

export default function DashboardLayout({ onLogout, children }: Props) {
  return (
    <Box sx={{ display: "flex" }}>
      <DashboardSidebar onLogout={onLogout} />
      <DashboardContent>{children}</DashboardContent>
    </Box>
  );
}