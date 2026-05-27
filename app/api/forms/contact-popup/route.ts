import { withApiSecurity } from "@/lib/api/api.guard";
import { handleContactPopupForm } from "@/lib/forms/contact-popup-form.service";

export const POST = withApiSecurity(handleContactPopupForm, {
	mode: "public-form",
});