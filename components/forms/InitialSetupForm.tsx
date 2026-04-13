"use client";

import { useState } from "react";
import {
	Alert,
	Box,
	Button,
	TextField,
	Typography,
	Paper,
	Stack,
} from "@mui/material";
import { useRouter } from "next/navigation";

type SetupStartResponse = {
	qrCodeDataUrl: string;
	secretBase32: string;
	email: string;
};

export default function InitialSetupForm() {
	const router = useRouter();

	const [step, setStep] = useState<1 | 2>(1);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
	const [secretBase32, setSecretBase32] = useState("");
	const [token, setToken] = useState("");

	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleStartSetup = async () => {
		setError("");
		setMessage("");
		setIsLoading(true);

		try {
			const res = await fetch("/api/setup/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					password,
					confirmPassword,
				}),
			});

			const json = (await res.json().catch(() => null)) as SetupStartResponse | null;

			if (!res.ok) {
				setError((json as { message?: string } | null)?.message ?? "Failed to start setup");
				return;
			}

			setQrCodeDataUrl(json?.qrCodeDataUrl ?? "");
			setSecretBase32(json?.secretBase32 ?? "");
			setEmail(json?.email ?? email);
			setStep(2);
		} catch {
			setError("Failed to start setup");
		} finally {
			setIsLoading(false);
		}
	};

	const handleConfirmSetup = async () => {
		setError("");
		setMessage("");
		setIsLoading(true);

		try {
			const res = await fetch("/api/setup/confirm", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ token }),
			});

			const json = await res.json().catch(() => null);

			if (!res.ok) {
				setError(json?.message ?? "Failed to confirm setup");
				return;
			}

			setMessage("Setup completed successfully");
			router.replace("/admin/dashboard");
			router.refresh();
		} catch {
			setError("Failed to confirm setup");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Box
			display="flex"
			justifyContent="center"
			alignItems="center"
			minHeight="100vh"
			bgcolor="#f7f7f7"
			px={2}
		>
			<Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 420, borderRadius: 3 }}>
				<Stack spacing={2}>
					<Typography variant="h4" fontWeight={700}>
						Initial Setup
					</Typography>

					<Typography variant="body2" color="text.secondary">
						Create the only admin account and connect Google Authenticator.
					</Typography>

					{message ? <Alert severity="success">{message}</Alert> : null}
					{error ? <Alert severity="error">{error}</Alert> : null}

					{step === 1 ? (
						<>
							<TextField
								label="Admin Email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								fullWidth
							/>

							<TextField
								label="Password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								fullWidth
							/>

							<TextField
								label="Confirm Password"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								fullWidth
							/>

							<Button
								variant="contained"
								onClick={handleStartSetup}
								disabled={isLoading}
							>
								{isLoading ? "Preparing..." : "Continue to TOTP Setup"}
							</Button>
						</>
					) : (
						<>
							<Typography variant="body2">
								Admin email: <strong>{email}</strong>
							</Typography>

							{qrCodeDataUrl ? (
								<Box
									component="img"
									src={qrCodeDataUrl}
									alt="TOTP QR Code"
									sx={{
										width: 220,
										height: 220,
										border: "1px solid #ddd",
										borderRadius: 2,
										p: 1,
										bgcolor: "#fff",
										alignSelf: "center",
									}}
								/>
							) : null}

							{secretBase32 ? (
								<Alert severity="info">
									Backup secret: <strong>{secretBase32}</strong>
								</Alert>
							) : null}

							<TextField
								label="6-digit TOTP code"
								value={token}
								onChange={(e) =>
									setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
								}
								inputProps={{ inputMode: "numeric", maxLength: 6 }}
								fullWidth
							/>

							<Button
								variant="contained"
								onClick={handleConfirmSetup}
								disabled={isLoading || token.length !== 6}
							>
								{isLoading ? "Finishing..." : "Finish Setup"}
							</Button>
						</>
					)}
				</Stack>
			</Paper>
		</Box>
	);
}