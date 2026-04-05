import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";

export function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const url = req.nextUrl.clone();

  if (url.pathname.startsWith("/admin") && !sessionToken) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (url.pathname === "/" && sessionToken) {
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};