"use client";

import { Box } from "@mui/material";
import AdminSidebar from "@/components/navigation/AdminSidebar";

type Props = {
	children: React.ReactNode;
	onLogout: () => Promise<void> | void;
};

export default function AdminShell({ children, onLogout }: Props) {
	return (
		<Box sx={{ minHeight: "100vh", bgcolor: "#f9fafb" }}>
			<AdminSidebar onLogout={onLogout} />

			<Box
				sx={{
					ml: "260px",
					minHeight: "100vh",
					p: 4,
				}}
			>
				<Box
					sx={{
						maxWidth: 1100,
						display: "flex",
						flexDirection: "column",
						gap: 3,
					}}
				>
					{children}
				</Box>
			</Box>
		</Box>
	);
}