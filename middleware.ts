import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const auth = req.cookies.get("auth")?.value;
  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/admin") && auth !== "true") {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (url.pathname === "/" && auth === "true") {
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};