"use client";

import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import AdminShell from "@/components/dashboard/layout/AdminShell";
import AdminTabGuard from "@/components/admin/AdminTabGuard";
import { clearAdminTabUnlock } from "@/lib/security/admin-unlock.service";

export default function DashboardClient() {
  const router = useRouter();

  const handleLogout = async () => {
    clearAdminTabUnlock();

    await fetch("/api/logout", {
      method: "POST",
    });

    router.replace("/");
    router.refresh();
  };

  return (
    <AdminTabGuard>
      <AdminShell onLogout={handleLogout}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Dashboard
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Analytics and security activity overview.
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Login Activity
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    Coming soon
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Security Events
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    Coming soon
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    SMTP Status
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    Coming soon
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </AdminShell>
    </AdminTabGuard>
  );
}