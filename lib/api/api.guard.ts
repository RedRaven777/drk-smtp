import "server-only";

import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/security/security.service";

import {
  FORM_SIGNATURE_MAX_SKEW_MS,
  createRequestSignature,
  timingSafeEqualHex,
} from "@/lib/security/request-signature.service";

type ApiGuardOptions = {
  mode?: "admin" | "public-form";
};

const FORM_ALLOWED_SOURCES =
  process.env.NODE_ENV === "production"
    ? ["website-production"]
    : ["website-development"];

function isValidFormApiKey(req: Request) {
  const apiKey = req.headers.get("x-form-api-key");

  return (
    Boolean(process.env.PUBLIC_FORM_API_KEY) &&
    apiKey === process.env.PUBLIC_FORM_API_KEY
  );
}

function isValidFormSource(req: Request) {
  const source = req.headers.get("x-form-source") ?? "";

  return FORM_ALLOWED_SOURCES.includes(source);
}

type PublicFormVerificationResult =
  | {
      ok: true;
      request: Request;
    }
  | {
      ok: false;
      response: Response;
    };

async function verifyRequestSignature(
  req: Request
): Promise<PublicFormVerificationResult> {
  const timestamp =
    req.headers.get("x-form-timestamp") ?? "";

  const nonce =
    req.headers.get("x-form-nonce") ?? "";

  const signature =
    req.headers.get("x-form-signature") ?? "";

  const timestampNumber = Number(timestamp);

  if (
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() - timestampNumber) >
      FORM_SIGNATURE_MAX_SKEW_MS
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "Expired request",
        },
        {
          status: 401,
        }
      ),
    };
  }

  if (!nonce || nonce.length < 10) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "Invalid nonce",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const bodyBuffer = Buffer.from(
    await req.arrayBuffer()
  );

  const expectedSignature =
    createRequestSignature({
      body: bodyBuffer,
      timestamp,
      nonce,
      secret:
        process.env.PUBLIC_FORM_API_KEY!,
    });

  if (
    !signature ||
    !timingSafeEqualHex(
      signature,
      expectedSignature
    )
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "Invalid signature",
        },
        {
          status: 401,
        }
      ),
    };
  }

  return {
    ok: true,
    request: new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: bodyBuffer,
    }),
  };
}

async function assertPublicFormRequest(
  req: Request
): Promise<PublicFormVerificationResult> {
  if (req.method !== "POST") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "Method not allowed",
        },
        {
          status: 405,
        }
      ),
    };
  }

  if (!isValidFormApiKey(req)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      ),
    };
  }

  if (!isValidFormSource(req)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message: "Forbidden source",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return verifyRequestSignature(req);
}

export function withApiSecurity(
  handler: (
    req: Request
  ) => Promise<Response>,
  options: ApiGuardOptions = {}
) {
  return async (
    req: Request
  ): Promise<Response> => {
    try {
      if (
        options.mode ===
        "public-form"
      ) {
        const verification =
          await assertPublicFormRequest(
            req
          );

        if (verification.ok) {
          return handler(
            verification.request
          );
        }

        return verification.response;
      }

      assertSameOrigin(req);

      return await handler(req);
    } catch (error) {
      console.error(
        "API SECURITY BLOCKED:",
        error
      );

      return NextResponse.json(
        {
          message:
            "Invalid request origin",
        },
        {
          status: 403,
        }
      );
    }
  };
}