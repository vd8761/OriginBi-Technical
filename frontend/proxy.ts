// Next.js 16 "proxy" (the renamed middleware). Runs server-side for the
// protected route patterns below. We validate the user's Cognito access
// token by calling the assessment-service /api/auth/session endpoint, which
// verifies the JWT and confirms a matching `users` row exists.
//
// The token is mirrored into a cookie at login/register time by lib/api.ts
// so SSR has access to it.

import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "obi.accessToken";

const configuredAuthBase = process.env.NEXT_PUBLIC_AUTH_API_BASE?.replace(/\/$/, "");
const AUTH_API_BASE =
  process.env.AUTH_INTERNAL_URL?.replace(/\/$/, "") ??
  configuredAuthBase ??
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:5000/api");

export async function proxy(req: NextRequest) {
  // Admin login lives outside the Cognito flow for now.
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return redirectToLogin(req);
  }

  const sessionURL = `${AUTH_API_BASE}/auth/session`;
  const session = await fetch(sessionURL, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);

  if (!session?.ok) {
    return redirectToLogin(req);
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  const loginUrl = new URL("/", req.url);
  loginUrl.searchParams.set("login", "required");
  loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/student/:path*", "/explore/:path*", "/assessment/:path*"],
};
