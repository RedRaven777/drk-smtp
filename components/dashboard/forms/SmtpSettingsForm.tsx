"use client";

import { Box, Button, Divider, Paper, Stack, Typography, Alert } from "@mui/material";
import EmailInput from "../fields/EmailInput";
import PasswordInput from "../fields/PasswordInput";
import RecipientInput from "../fields/RecipientInput";
import type { SmtpFormState } from "@/types/dashboard";

type Props = {
	title: string;
	values: SmtpFormState;
	onChange: React.Dispatch<React.SetStateAction<SmtpFormState>>;
	onSubmit: () => void;
	isSaving?: boolean;
	message?: string;
	error?: string;
};

export default function SmtpSettingsForm({
	title,
	values,
	onChange,
	onSubmit,
	isSaving = false,
	message = "",
	error = "",
}: Props) {
	return (
		<Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
			<Typography variant="h6" fontWeight={700} mb={2}>
				{title}
			</Typography>

			<Divider sx={{ mb: 3 }} />

			<Stack spacing={2}>
				<EmailInput
					label="User"
					value={values.user}
					onChange={(value) =>
						onChange((prev) => ({ ...prev, user: value }))
					}
				/>

				<Box>
					<PasswordInput
						value={values.password}
						onChange={(value) =>
							onChange((prev) => ({ ...prev, password: value }))
						}
					/>
					{values.hasPassword ? (
						<Typography variant="body2" color="text.secondary" mt={0.75}>
							Password is already saved. Leave this field empty to keep the current password.
						</Typography>
					) : null}
				</Box>

				<RecipientInput
					value={values.recipient}
					onChange={(value) =>
						onChange((prev) => ({ ...prev, recipient: value }))
					}
				/>

				{message ? <Alert severity="success">{message}</Alert> : null}
				{error ? <Alert severity="error">{error}</Alert> : null}

				<Box>
					<Button variant="contained" onClick={onSubmit} disabled={isSaving}>
						{isSaving ? "Saving..." : "Save"}
					</Button>
				</Box>
			</Stack>
		</Paper>
	);
}