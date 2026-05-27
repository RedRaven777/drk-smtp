import { withApiSecurity } from "@/lib/api/api.guard";
import { handleContactForm } from "@/lib/forms/contact-form.service";

export const POST = withApiSecurity(handleContactForm, {
	mode: "public-form",
});