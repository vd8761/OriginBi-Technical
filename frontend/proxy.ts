import { NextRequest, NextResponse } from "next/server";

const configuredEngineURL =
  process.env.ENGINE_INTERNAL_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");

const ENGINE_INTERNAL_URL =
  configuredEngineURL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:8088");

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookie = req.headers.get("cookie") ?? "";
  const sessionURL = ENGINE_INTERNAL_URL
    ? `${ENGINE_INTERNAL_URL}/v1/auth/session`
    : new URL("/v1/auth/session", req.url).toString();
  const session = await fetch(sessionURL, {
    headers: cookie ? { Cookie: cookie } : {},
    credentials: "include",
    cache: "no-store",
  }).catch(() => null);

  if (!session?.ok) {
    const url = req.nextUrl.clone();
    const loginUrl = new URL("/", req.url);
    loginUrl.searchParams.set("login", "required");
    loginUrl.searchParams.set("next", `${url.pathname}${url.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/student/:path*", "/explore/:path*", "/assessment/:path*", "/admin/:path*"],
};
