"use client";

import { useState } from "react";
import {
	Alert,
	Box,
	Button,
	Divider,
	List,
	ListItem,
	ListItemText,
	Paper,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { startRegistration } from "@simplewebauthn/browser";

type CredentialItem = {
	id: string;
	name: string | null;
	createdAt: string;
};

type Props = {
	credentials: CredentialItem[];
};

export default function WebAuthnKeysForm({ credentials }: Props) {
	const [keyName, setKeyName] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleRegisterKey = async () => {
		setError("");
		setMessage("");
		setIsLoading(true);

		try {
			const optionsRes = await fetch("/api/webauthn/register/options", {
				method: "POST",
			});

			const optionsJson = await optionsRes.json().catch(() => null);

			if (!optionsRes.ok || !optionsJson?.options) {
				setError(optionsJson?.message ?? "Failed to create registration options");
				return;
			}

			const attResp = await startRegistration({
				optionsJSON: optionsJson.options,
			});

			const verifyRes = await fetch("/api/webauthn/register/verify", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					response: attResp,
					name: keyName,
				}),
			});

			const verifyJson = await verifyRes.json().catch(() => null);

			if (!verifyRes.ok) {
				setError(verifyJson?.message ?? "Failed to register security key");
				return;
			}

			setMessage("Security key registered. Reload the page to see it in the list.");
			setKeyName("");
		} catch (err) {
			setError("Security key registration was cancelled or failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
			<Typography variant="h6" fontWeight={700} mb={2}>
				YubiKey / Security Keys
			</Typography>

			<Divider sx={{ mb: 3 }} />

			<Stack spacing={2}>
				<Typography variant="body2">
					Register both of your YubiKeys: one primary and one backup.
				</Typography>

				<TextField
					label="Key name"
					placeholder="Example: Primary key"
					value={keyName}
					onChange={(e) => setKeyName(e.target.value)}
					fullWidth
				/>

				<Box>
					<Button
						variant="contained"
						onClick={handleRegisterKey}
						disabled={isLoading}
					>
						{isLoading ? "Registering..." : "Register Security Key"}
					</Button>
				</Box>

				{message ? <Alert severity="success">{message}</Alert> : null}
				{error ? <Alert severity="error">{error}</Alert> : null}

				<Box>
					<Typography variant="subtitle1" fontWeight={700} mb={1}>
						Registered keys
					</Typography>

					{credentials.length === 0 ? (
						<Typography variant="body2" color="text.secondary">
							No security keys registered yet.
						</Typography>
					) : (
						<List disablePadding>
							{credentials.map((credential) => (
								<ListItem key={credential.id} disableGutters>
									<ListItemText
										primary={credential.name || "Unnamed key"}
										secondary={`Added: ${new Date(credential.createdAt).toLocaleString()}`}
									/>
								</ListItem>
							))}
						</List>
					)}
				</Box>
			</Stack>
		</Paper>
	);
}