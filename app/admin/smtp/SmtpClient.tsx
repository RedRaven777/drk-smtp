"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/dashboard/layout/AdminShell";
import AdminTabGuard from "@/components/admin/AdminTabGuard";
import SmtpSettingsForm from "@/components/dashboard/forms/SmtpSettingsForm";
import SensitiveActionReauthDialog from "@/components/dashboard/forms/SensitiveActionReauthDialog";
import {
	SMTP_CONFIG_KEYS,
	initialSmtpForm,
	type AdminSmtpConfigDto,
	type SmtpConfigKey,
	type SmtpFormState,
} from "@/types/dashboard";
import { clearAdminTabUnlock } from "@/lib/security/admin-unlock.service";

type Props = {
	smtpConfigs: AdminSmtpConfigDto[];
};

type SaveState = {
	loading: boolean;
	message: string;
	error: string;
};

type PendingSmtpSave =
	| {
			key: SmtpConfigKey;
			values: SmtpFormState;
			setSaveState: React.Dispatch<React.SetStateAction<SaveState>>;
			setFormState: React.Dispatch<React.SetStateAction<SmtpFormState>>;
		}
	| null;

const initialSaveState: SaveState = {
	loading: false,
	message: "",
	error: "",
};

function isConfigComplete(config?: AdminSmtpConfigDto) {
	return Boolean(
		config?.smtpUserMasked &&
			config?.smtpHost &&
			config?.smtpPort &&
			config?.hasPassword &&
			config?.hasRecipient
	);
}

function createSmtpFormState(config?: AdminSmtpConfigDto): SmtpFormState {
	const configured = isConfigComplete(config);

	return {
		...initialSmtpForm,
		user: "",
		smtpHost: config?.smtpHost ?? "",
		smtpPort:
			config?.smtpPort !== null && config?.smtpPort !== undefined
				? String(config.smtpPort)
				: "",
		password: "",
		recipient: "",
		hasPassword: config?.hasPassword ?? false,
		hasRecipient: config?.hasRecipient ?? false,
		isConfigured: configured,
		isEditing: !configured,
		smtpUserMasked: config?.smtpUserMasked ?? null,
		recipientMasked: config?.recipientMasked ?? null,
	};
}

export default function SmtpClient({ smtpConfigs }: Props) {
	const router = useRouter();

	const configMap = useMemo(() => {
		return Object.fromEntries(
			smtpConfigs.map((config) => [config.key, config])
		) as Partial<Record<SmtpConfigKey, AdminSmtpConfigDto>>;
	}, [smtpConfigs]);

	const [pendingSmtpSave, setPendingSmtpSave] =
		useState<PendingSmtpSave>(null);

	const [reauthOpen, setReauthOpen] = useState(false);

	const [careerSmtp, setCareerSmtp] = useState<SmtpFormState>(() =>
		createSmtpFormState(configMap[SMTP_CONFIG_KEYS.CAREER])
	);

	const [contactsSmtp, setContactsSmtp] = useState<SmtpFormState>(() =>
		createSmtpFormState(configMap[SMTP_CONFIG_KEYS.CONTACTS])
	);

	const [newrecipeSmtp, setNewrecipeSmtp] = useState<SmtpFormState>(() =>
		createSmtpFormState(configMap[SMTP_CONFIG_KEYS.NEWRECIPE])
	);

	const [contactsPopupSmtp, setContactsPopupSmtp] =
		useState<SmtpFormState>(() =>
			createSmtpFormState(configMap[SMTP_CONFIG_KEYS.CONTACTS_POPUP])
		);

	const [careerSave, setCareerSave] = useState<SaveState>(initialSaveState);
	const [contactsSave, setContactsSave] = useState<SaveState>(initialSaveState);
	const [newrecipeSave, setNewrecipeSave] =
		useState<SaveState>(initialSaveState);
	const [contactsPopupSave, setContactsPopupSave] =
		useState<SaveState>(initialSaveState);

	const handleLogout = async () => {
		clearAdminTabUnlock();

		await fetch("/api/logout", {
			method: "POST",
		});

		router.replace("/");
		router.refresh();
	};

	const validateBeforeSave = (values: SmtpFormState): string | null => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		if (!values.smtpHost.trim()) return "SMTP host is required";
		if (!values.smtpPort.trim()) return "SMTP port is required";

		const port = Number(values.smtpPort);

		if (!Number.isInteger(port) || port < 1 || port > 65535) {
			return "SMTP port must be an integer between 1 and 65535";
		}

		if (!values.isConfigured) {
			if (!values.user.trim()) return "SMTP user is required";

			if (!emailRegex.test(values.user.trim())) {
				return "SMTP user must be a valid email";
			}

			if (!values.password.trim()) return "SMTP password is required";
			if (!values.recipient.trim()) return "Recipient is required";

			if (!emailRegex.test(values.recipient.trim())) {
				return "Recipient must be a valid email";
			}

			return null;
		}

		if (values.user.trim() && !emailRegex.test(values.user.trim())) {
			return "New SMTP user must be a valid email";
		}

		if (values.recipient.trim() && !emailRegex.test(values.recipient.trim())) {
			return "New recipient must be a valid email";
		}

		return null;
	};

	const requestSaveConfig = (
		values: SmtpFormState,
		key: SmtpConfigKey,
		setSaveState: React.Dispatch<React.SetStateAction<SaveState>>,
		setFormState: React.Dispatch<React.SetStateAction<SmtpFormState>>
	) => {
		const validationError = validateBeforeSave(values);

		if (validationError) {
			setSaveState({
				loading: false,
				message: "",
				error: validationError,
			});

			return;
		}

		setPendingSmtpSave({
			key,
			values,
			setSaveState,
			setFormState,
		});

		setReauthOpen(true);
	};

	const saveConfigAfterReauth = async () => {
		if (!pendingSmtpSave) return;

		const { values, key, setSaveState, setFormState } = pendingSmtpSave;

		setSaveState({
			loading: true,
			message: "",
			error: "",
		});

		try {
			const res = await fetch("/api/admin/smtp-config", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					key,
					smtpUser: values.user.trim() || undefined,
					password: values.password || undefined,
					recipient: values.recipient.trim() || undefined,
					smtpHost: values.smtpHost,
					smtpPort: Number(values.smtpPort),
				}),
			});

			const json = await res.json().catch(() => null);

			if (!res.ok) {
				setSaveState({
					loading: false,
					message: "",
					error: json?.message ?? "Failed to save config",
				});

				return;
			}

			setSaveState({
				loading: false,
				message: "Saved successfully",
				error: "",
			});

			setFormState((prev) => ({
				...prev,
				user: "",
				password: "",
				recipient: "",
				hasPassword: true,
				hasRecipient: true,
				isConfigured: true,
				isEditing: false,
			}));

			router.refresh();
		} catch {
			setSaveState({
				loading: false,
				message: "",
				error: "Failed to save config",
			});
		} finally {
			setPendingSmtpSave(null);
		}
	};

	const cancelEdit = (
		setFormState: React.Dispatch<React.SetStateAction<SmtpFormState>>
	) => {
		setFormState((prev) => ({
			...prev,
			user: "",
			password: "",
			recipient: "",
			isEditing: false,
		}));
	};

	return (
		<AdminTabGuard>
			<AdminShell onLogout={handleLogout}>
				<SmtpSettingsForm
					title="Career SMTP"
					values={careerSmtp}
					onChange={setCareerSmtp}
					onSubmit={() =>
						requestSaveConfig(
							careerSmtp,
							SMTP_CONFIG_KEYS.CAREER,
							setCareerSave,
							setCareerSmtp
						)
					}
					onCancelEdit={() => cancelEdit(setCareerSmtp)}
					isSaving={careerSave.loading}
					message={careerSave.message}
					error={careerSave.error}
				/>

				<SmtpSettingsForm
					title="Contacts SMTP"
					values={contactsSmtp}
					onChange={setContactsSmtp}
					onSubmit={() =>
						requestSaveConfig(
							contactsSmtp,
							SMTP_CONFIG_KEYS.CONTACTS,
							setContactsSave,
							setContactsSmtp
						)
					}
					onCancelEdit={() => cancelEdit(setContactsSmtp)}
					isSaving={contactsSave.loading}
					message={contactsSave.message}
					error={contactsSave.error}
				/>

				<SmtpSettingsForm
					title="Newrecipe SMTP"
					values={newrecipeSmtp}
					onChange={setNewrecipeSmtp}
					onSubmit={() =>
						requestSaveConfig(
							newrecipeSmtp,
							SMTP_CONFIG_KEYS.NEWRECIPE,
							setNewrecipeSave,
							setNewrecipeSmtp
						)
					}
					onCancelEdit={() => cancelEdit(setNewrecipeSmtp)}
					isSaving={newrecipeSave.loading}
					message={newrecipeSave.message}
					error={newrecipeSave.error}
				/>

				<SmtpSettingsForm
					title="Contacts Popup SMTP"
					values={contactsPopupSmtp}
					onChange={setContactsPopupSmtp}
					onSubmit={() =>
						requestSaveConfig(
							contactsPopupSmtp,
							SMTP_CONFIG_KEYS.CONTACTS_POPUP,
							setContactsPopupSave,
							setContactsPopupSmtp
						)
					}
					onCancelEdit={() => cancelEdit(setContactsPopupSmtp)}
					isSaving={contactsPopupSave.loading}
					message={contactsPopupSave.message}
					error={contactsPopupSave.error}
				/>

				<SensitiveActionReauthDialog
					open={reauthOpen}
					purpose="smtp_secret_management"
					title="Confirm SMTP changes"
					description="To save SMTP settings, enter your password, current TOTP code, and confirm with a registered security key."
					totpRequired
					onClose={() => {
						setReauthOpen(false);
						setPendingSmtpSave(null);
					}}
					onVerified={saveConfigAfterReauth}
				/>
			</AdminShell>
		</AdminTabGuard>
	);
}