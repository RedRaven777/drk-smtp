import { withApiSecurity } from "@/lib/api/api.guard";
import { handleCareerForm } from "@/lib/forms/career-form.service";

export const POST = withApiSecurity(handleCareerForm, {
	mode: "public-form",
});