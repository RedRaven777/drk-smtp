"use client";

import useIdleLogout from "@/hooks/useIdleLogout";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useIdleLogout(15 * 60 * 1000);
  return <>{children}</>;
}