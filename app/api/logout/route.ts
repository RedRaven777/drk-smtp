import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSessionByToken, getSessionCookieName } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;

  if (sessionToken) {
    await deleteSessionByToken(sessionToken);
  }

  const res = NextResponse.json({ message: "Logged out" });

  res.cookies.set({
    name: getSessionCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res;
}