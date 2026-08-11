import { NextResponse } from "next/server";

export function middleware(request) {
    console.log("MIDDLEWARE RAN:", request.nextUrl.pathname);
  const token = request.cookies.get("kidsecure_token");
  const isLoggedIn = Boolean(token);
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";

  // Not logged in and trying to view a protected page → send to login
  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in and somehow on the login page → send to dashboard
  if (isLoggedIn && isLoginPage) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on everything except:
     * - api routes (they handle their own auth)
     * - static files, images, favicon
     */
    "/((?!api|_next/static|_next/image|favicon.ico|pictures).*)",
  ],
};