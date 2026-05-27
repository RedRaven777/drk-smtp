import "server-only";

import { NextResponse } from "next/server";

const allowedSources = ["website"];

function isValidApiKey(req: Request) {
	const apiKey = req.headers.get("x-form-api-key");

	return Boolean(process.env.PUBLIC_FORM_API_KEY) && apiKey === process.env.PUBLIC_FORM_API_KEY;
}

function isValidSource(req: Request) {
	const source = req.headers.get("x-form-source");

	return allowedSources.includes(source ?? "");
}

export function withPublicFormSecurity(
	handler: (req: Request) => Promise<Response>
) {
	return async function publicFormHandler(req: Request) {
		if (req.method !== "POST") {
			return NextResponse.json(
				{ message: "Method not allowed" },
				{ status: 405 }
			);
		}

		if (!isValidApiKey(req)) {
			return NextResponse.json(
				{ message: "Unauthorized" },
				{ status: 401 }
			);
		}

		if (!isValidSource(req)) {
			return NextResponse.json(
				{ message: "Forbidden source" },
				{ status: 403 }
			);
		}

		return handler(req);
	};
}