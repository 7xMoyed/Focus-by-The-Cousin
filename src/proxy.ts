import { NextRequest, NextResponse } from "next/server";
import { isValidFounderSession } from "@/lib/founder-session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /founder but allow /founder/login through
  if (pathname.startsWith("/founder") && pathname !== "/founder/login") {
    const auth = request.cookies.get("founder_auth")?.value;
    if (!isValidFounderSession(auth)) {
      const loginUrl = new URL("/founder/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/founder", "/founder/:path*"],
};
