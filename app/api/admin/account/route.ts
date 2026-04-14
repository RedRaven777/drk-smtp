import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireRecentSensitiveAction } from "@/lib/sensitive-action";
import { createAuditLog } from "@/lib/audit";
import { getSessionCookieName } from "@/lib/session";

export async function PATCH(req: Request) {
  try {
    const user = await requireAdminUser();

    const allowed = await requireRecentSensitiveAction({
      userId: user.id,
      purpose: "account_management",
    });

    if (!allowed) {
      return NextResponse.json(
        { message: "Fresh verification is required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const action = String(body?.action ?? "").trim();

    if (action === "change_email") {
      const newEmail = String(body?.newEmail ?? "").trim().toLowerCase();

      if (!newEmail) {
        return NextResponse.json(
          { message: "New email is required" },
          { status: 400 }
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return NextResponse.json(
          { message: "Valid email is required" },
          { status: 400 }
        );
      }

      const existing = await prisma.adminUser.findUnique({
        where: { email: newEmail },
      });

      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          { message: "This email is already in use" },
          { status: 409 }
        );
      }

      const updated = await prisma.adminUser.update({
        where: { id: user.id },
        data: {
          email: newEmail,
        },
      });

      await createAuditLog({
        actorUserId: user.id,
        action: "ACCOUNT_EMAIL_CHANGED",
        targetType: "AdminUser",
        targetId: user.id,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      });

      return NextResponse.json({
        message: "Email updated successfully",
        email: updated.email,
      });
    }

    if (action === "change_password") {
      const newPassword = String(body?.newPassword ?? "");
      const confirmPassword = String(body?.confirmPassword ?? "");

      if (!newPassword || newPassword.length < 12) {
        return NextResponse.json(
          { message: "New password must be at least 12 characters" },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { message: "Passwords do not match" },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(newPassword);

      await prisma.adminUser.update({
        where: { id: user.id },
        data: {
          passwordHash,
        },
      });

      await prisma.adminSession.deleteMany({
        where: { userId: user.id },
      });

      await createAuditLog({
        actorUserId: user.id,
        action: "ACCOUNT_PASSWORD_CHANGED",
        targetType: "AdminUser",
        targetId: user.id,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      });

      const res = NextResponse.json({
        message: "Password updated successfully. Please log in again.",
        forceLogout: true,
      });

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

    return NextResponse.json(
      { message: "Invalid account action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("ACCOUNT PATCH ERROR:", error);
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}