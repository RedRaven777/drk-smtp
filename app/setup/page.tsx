import { redirect } from "next/navigation";
import InitialSetupForm from "@/components/forms/InitialSetupForm";
import { isAppInitialized } from "@/lib/bootstrap/bootstrap.service";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
	const initialized = await isAppInitialized();

	if (initialized) {
		redirect("/");
	}

	return <InitialSetupForm />;
}