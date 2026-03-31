import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ message: "Session refreshed" });

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
}