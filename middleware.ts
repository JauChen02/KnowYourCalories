import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const fallbackSecret = "knowyourcalories-dev-secret";

const protectedPagePrefixes = [
  "/dashboard",
  "/upload",
  "/history",
  "/verify",
  "/settings",
  "/onboarding",
];

function isProtectedPage(pathname: string) {
  return protectedPagePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isProtectedApi = pathname.startsWith("/api/");
  const needsAuth = isProtectedApi || isProtectedPage(pathname);

  if (!needsAuth) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? fallbackSecret,
  });

  if (token) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upload/:path*",
    "/history/:path*",
    "/verify/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/api/:path*",
  ],
};
