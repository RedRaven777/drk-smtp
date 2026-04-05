import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSession, getSessionCookieName } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const totp = String(body.totp ?? "").trim();

    const user = await prisma.adminUser.findUnique({
      where: { email },
      include: { totp: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { message: "Account temporarily locked" },
        { status: 423 }
      );
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);

    if (!passwordOk) {
      await prisma.adminUser.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });

      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // TOTP verification підключимо наступним кроком.
    if (user.totp?.isEnabled) {
      if (!totp) {
        return NextResponse.json(
          { message: "TOTP code is required" },
          { status: 401 }
        );
      }
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const userAgent = req.headers.get("user-agent");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

    const { token, expiresAt } = await createSession({
      userId: user.id,
      userAgent,
      ipAddress,
      ttlSeconds: 60 * 30,
    });

    const res = NextResponse.json({ message: "Logged in" });

    res.cookies.set({
      name: getSessionCookieName(),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return res;
  } catch {
    return NextResponse.json({ message: "Bad request" }, { status: 400 });
  }
}