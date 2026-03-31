import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { isValidLogin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!isValidLogin(parsed.data)) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ message: "Logged in" });

    res.cookies.set({
      name: "auth",
      value: "true",
      httpOnly: true,
      path: "/",
      maxAge: 5 * 60,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }
}