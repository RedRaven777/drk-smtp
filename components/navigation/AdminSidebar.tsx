"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Box,
	Button,
	Stack,
	Typography,
} from "@mui/material";

type Props = {
	onLogout: () => Promise<void> | void;
};

const navItems = [
	{
		label: "Dashboard",
		href: "/admin/dashboard",
	},
	{
		label: "Security",
		href: "/admin/security",
	},
];

export default function AdminSidebar({ onLogout }: Props) {
	const pathname = usePathname();

	return (
		<Box
			sx={{
				width: 260,
				minWidth: 260,
				height: "100vh",
				position: "fixed",
				top: 0,
				left: 0,
				bgcolor: "#111827",
				color: "#fff",
				borderRight: "1px solid rgba(255,255,255,0.08)",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				p: 3,
			}}
		>
			<Box>
				<Typography variant="h5" fontWeight={700} mb={4}>
					Admin Panel
				</Typography>

				<Stack spacing={1}>
					{navItems.map((item) => {
						const isActive = pathname === item.href;

						return (
							<Box
								key={item.href}
								component={Link}
								href={item.href}
								sx={{
									textDecoration: "none",
									color: "#fff",
									px: 2,
									py: 1.5,
									borderRadius: 2,
									bgcolor: isActive ? "rgba(255,255,255,0.14)" : "transparent",
									transition: "background-color 0.2s ease",
									"&:hover": {
										bgcolor: "rgba(255,255,255,0.08)",
									},
								}}
							>
								{item.label}
							</Box>
						);
					})}
				</Stack>
			</Box>

			<Button
				variant="contained"
				color="error"
				onClick={onLogout}
				fullWidth
			>
				Logout
			</Button>
		</Box>
	);
}