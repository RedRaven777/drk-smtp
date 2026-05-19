"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { hasValidAdminTabUnlock } from "@/lib/security/admin-unlock.service";

type Props = {
  children: React.ReactNode;
};

export default function AdminTabGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const ok = hasValidAdminTabUnlock();

    if (!ok) {
      router.replace(`/admin/unlock?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setAllowed(true);
    setChecked(true);
  }, [pathname, router]);

  if (!checked || !allowed) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}