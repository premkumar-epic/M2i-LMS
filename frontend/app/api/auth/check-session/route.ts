// frontend/app/api/auth/check-session/route.ts
// Called by middleware when the access_token is expired.
// Attempts a silent refresh via the backend, then redirects
// to the original destination (or /login on failure).

import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const redirectTo = searchParams.get("redirect") ?? "/";

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

    // Backend responds with Set-Cookie for the new access_token.
    // Forward that cookie to the browser then redirect.
    const response = NextResponse.redirect(
      new URL(redirectTo, request.url)
    );

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(redirectTo)}`, request.url)
    );
  }
}
