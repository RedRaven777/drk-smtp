import "server-only";

import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/security/security.service";

type ApiGuardOptions = {
  mode?: "admin" | "public-form";
};

const FORM_ALLOWED_SOURCES = ["website"];

function isValidFormApiKey(req: Request) {
  const apiKey = req.headers.get("x-form-api-key");

  return (
    Boolean(process.env.PUBLIC_FORM_API_KEY) &&
    apiKey === process.env.PUBLIC_FORM_API_KEY
  );
}

function isValidFormSource(req: Request) {
  const source = req.headers.get("x-form-source");

  return FORM_ALLOWED_SOURCES.includes(source ?? "");
}

function assertPublicFormRequest(req: Request) {
  if (req.method !== "POST") {
    return NextResponse.json(
      { message: "Method not allowed" },
      { status: 405 }
    );
  }

  if (!isValidFormApiKey(req)) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!isValidFormSource(req)) {
    return NextResponse.json(
      { message: "Forbidden source" },
      { status: 403 }
    );
  }

  return null;
}

export function withApiSecurity(
  handler: (req: Request) => Promise<Response>,
  options: ApiGuardOptions = {}
) {
  return async (req: Request): Promise<Response> => {
    try {
      if (options.mode === "public-form") {
        const blockedResponse = assertPublicFormRequest(req);

        if (blockedResponse) {
          return blockedResponse;
        }

        return await handler(req);
      }

      assertSameOrigin(req);
      return await handler(req);
    } catch (error) {
      console.error("API SECURITY BLOCKED:", error);

      return NextResponse.json(
        { message: "Invalid request origin" },
        { status: 403 }
      );
    }
  };
}