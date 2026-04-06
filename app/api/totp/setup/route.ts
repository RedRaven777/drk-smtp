import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { getCurrentAdminUser } from "@/lib/auth";
import { encryptString } from "@/lib/crypto";
import { generateTotpSetup, generateTotpSecret } from "@/lib/totp";

const TOTP_SETUP_COOKIE = "totp_setup_secret";

export async function POST() {
  const user = await getCurrentAdminUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const secretBase32 = generateTotpSecret();
  const { otpauthUrl } = generateTotpSetup(secretBase32, user.email);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  const cookieStore = await cookies();

  cookieStore.set({
    name: TOTP_SETUP_COOKIE,
    value: encryptString(secretBase32),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.json({
    qrCodeDataUrl,
    secretBase32,
  });
}