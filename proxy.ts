import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login", "/api/spin", "/api/reminder"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = await sessionToken();

  if (cookie && expected && cookie === expected) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
