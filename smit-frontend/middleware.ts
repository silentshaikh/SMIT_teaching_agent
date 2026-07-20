import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "change-me-to-a-random-secret"
);

const PUBLIC_PATHS = ["/", "/login", "/register", "/api/auth/login", "/api/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/_next"))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("smit_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string | undefined;

    const isTeacherOnlyRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/rubrics") || pathname.startsWith("/submissions");
    const isStudentOnlyRoute = pathname.startsWith("/history") || pathname.startsWith("/report") || pathname.startsWith("/progress");

    if (isTeacherOnlyRoute && role !== "teacher") {
      return NextResponse.redirect(new URL("/submit", request.url));
    }

    if (isStudentOnlyRoute && role !== "student") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    // Invalid or expired token — redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
