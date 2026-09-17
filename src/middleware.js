import { NextResponse } from "next/server";
// src/middleware.js
export function middleware(request) {
  const token = request.cookies.get("kidsecure_token");
  const teacherToken = request.cookies.get("kidsecure_teacher_token");
  const isLoggedIn = Boolean(token);
  const { pathname } = request.nextUrl;

  const isTeacherPath = pathname === "/teacher" || pathname.startsWith("/teacher/");
  const isTeacherLoginPage = pathname === "/teacher/login";

  if (isTeacherPath) {
    if (!teacherToken && !isTeacherLoginPage) {
      return NextResponse.redirect(new URL("/teacher/login", request.url));
    }

    if (teacherToken && isTeacherLoginPage) {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    }

    return NextResponse.next();
  }

  const isLoginPage = pathname === "/login";
  const isGuestPage = pathname === "/guest";

  // Not logged in and trying to view a protected page → send to login
  if (!isLoggedIn && !isLoginPage && !isGuestPage) {
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