import "server-only";

import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/security";

export function withApiSecurity(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
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