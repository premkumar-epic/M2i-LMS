// frontend/app/api/auth/check-session/route.ts
// Called by middleware when the access_token is expired.
// Attempts a silent refresh via the backend, then redirects
// to the original destination (or /login on failure).

import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Validate that a redirect target is a same-origin path, not an external URL. */
const isSafeRedirect = (value: string): boolean => {
  // Must start with / but not // (protocol-relative URLs like //evil.com)
  return value.startsWith("/") && !value.startsWith("//");
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawRedirect = searchParams.get("redirect") ?? "/";

  // Reject any redirect that isn't a same-origin path to prevent open redirect
  const redirectTo = isSafeRedirect(rawRedirect) ? rawRedirect : "/";

  try {
    // Forward cookies so the backend can read refresh_token
    const res = await fetch(`${BACKEND}/api/auth/refresh-token`, {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Refresh failed");
    }

    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    // Forward ALL Set-Cookie headers from the backend response.
    // res.headers.get() returns only the first value; use getSetCookie() for all.
    const setCookies = res.headers.getSetCookie();
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  } catch {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(redirectTo)}`, request.url)
    );
  }
}
