import { withApiSecurity } from "@/lib/api/api.guard";
import { handleNewRecipeForm } from "@/lib/forms/newrecipe-form.service";

export const POST = withApiSecurity(handleNewRecipeForm, {
	mode: "public-form",
});