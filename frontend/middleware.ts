// frontend/middleware.ts
// Next.js middleware runs on every request BEFORE the page renders.
// This file handles:
//   1. Redirecting unauthenticated users to /login
//   2. Redirecting authenticated users to their role dashboard
//      if they try to access the wrong role's pages
//   3. Redirecting users away from /login if already logged in
//
// It reads the access_token cookie and decodes the JWT payload
// to extract the user's role WITHOUT making a network request.
// This keeps middleware fast — no backend call on every page load.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// =========================================================
// ROUTE CONFIGURATION
// =========================================================

// Routes accessible without any authentication
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh-token",
  "/api/auth/check-session", // Must be public — middleware redirects here on expired token
  "/api/health",
];

// Route prefixes and the roles that can access them
const ROLE_ROUTE_MAP: Record<string, string[]> = {
  "/student": ["STUDENT"],
  "/mentor": ["MENTOR"],
  "/admin": ["ADMIN", "SUPER_ADMIN"],
};

// Default redirect for each role after login
const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  STUDENT: "/student/dashboard",
  MENTOR: "/mentor/dashboard",
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
};

// =========================================================
// JWT PAYLOAD DECODER
// Decodes the JWT payload WITHOUT verification.
// Verification happens on the backend for every API call.
// Here we only need the role for routing decisions.
// =========================================================

type JWTPayload = {
  user_id: string;
  role?: string;
  exp: number;
  iat: number;
};

const decodeJWTPayload = (token: string): JWTPayload | null => {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode base64url payload
    const payload = parts[1];
    // Add padding if needed
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64url").toString("utf-8");
    return JSON.parse(decoded) as JWTPayload;
  } catch {
    return null;
  }
};

const isTokenExpired = (payload: JWTPayload): boolean => {
  // exp is in seconds, Date.now() is in milliseconds
  return payload.exp * 1000 < Date.now();
};

// =========================================================
// MIDDLEWARE FUNCTION
// =========================================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // -------------------------------------------------------
  // STEP 1: Allow public routes through without any checks
  // -------------------------------------------------------
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) =>
      pathname === route || pathname.startsWith(route + "/")
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Allow Next.js internals through.
  // NOTE: pathname.includes(".") is intentionally removed — the matcher config
  // already excludes known static extensions, and a dot-check would bypass auth
  // for any path containing a dot (e.g. /admin/export.csv).
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // -------------------------------------------------------
  // STEP 2: Read the access_token cookie
  // -------------------------------------------------------
  const accessToken = request.cookies.get("access_token")?.value;

  // -------------------------------------------------------
  // STEP 3: No token → redirect to login
  // -------------------------------------------------------
  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the original destination so we can redirect
    // back after login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // -------------------------------------------------------
  // STEP 4: Decode JWT payload
  // -------------------------------------------------------
  const payload = decodeJWTPayload(accessToken);

  if (!payload) {
    // Malformed token → clear it and redirect to login
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    return response;
  }

  // -------------------------------------------------------
  // STEP 5: Expired token → redirect to login
  // The frontend Axios interceptor handles silent refresh
  // for API calls, but for page navigation we redirect.
  // The refresh will happen when the login page loads
  // and detects a valid refresh_token cookie.
  // -------------------------------------------------------
  if (isTokenExpired(payload)) {
    // Don't redirect to login — redirect to a refresh endpoint
    // that will refresh the token and redirect to original page.
    // If refresh fails, the login page handles it.
    const refreshUrl = new URL("/api/auth/check-session",
      request.url);
    refreshUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(refreshUrl);
  }

  const userRole = payload.role;

  // -------------------------------------------------------
  // STEP 6: No role assigned yet → redirect to pending page
  // This happens when a user registers but admin has not
  // assigned a role yet
  // -------------------------------------------------------
  if (!userRole) {
    if (pathname !== "/pending-role") {
      return NextResponse.redirect(
        new URL("/pending-role", request.url)
      );
    }
    return NextResponse.next();
  }

  // -------------------------------------------------------
  // STEP 7: Root path → redirect to role's default page
  // -------------------------------------------------------
  if (pathname === "/") {
    const defaultRoute =
      ROLE_DEFAULT_ROUTES[userRole] ?? "/login";
    return NextResponse.redirect(new URL(defaultRoute, request.url));
  }

  // -------------------------------------------------------
  // STEP 8: Role-based route protection
  // Check if the user's role is allowed to access the
  // current route prefix
  // -------------------------------------------------------
  for (const [routePrefix, allowedRoles] of Object.entries(
    ROLE_ROUTE_MAP
  )) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(userRole)) {
        // User is authenticated but wrong role
        // Redirect to their own dashboard
        const defaultRoute =
          ROLE_DEFAULT_ROUTES[userRole] ?? "/login";
        return NextResponse.redirect(
          new URL(defaultRoute, request.url)
        );
      }
      // Role matches — allow through
      return NextResponse.next();
    }
  }

  // -------------------------------------------------------
  // STEP 9: Route not in any protected prefix → allow through
  // (e.g., /notifications, /profile — accessible to all roles)
  // -------------------------------------------------------
  return NextResponse.next();
}

// =========================================================
// MATCHER CONFIG
// Tells Next.js which paths this middleware runs on.
// Excludes static files and Next.js internals for performance.
// =========================================================

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - Files with extensions (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};