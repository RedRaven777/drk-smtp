import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/schemas";
import { isValidReset } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!isValidReset(parsed.data)) {
      return NextResponse.json({ message: "Invalid email or TOTP" }, { status: 400 });
    }

    return NextResponse.json({
      message: `Reset link sent to ${parsed.data.email}`,
    });
  } catch {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }
}