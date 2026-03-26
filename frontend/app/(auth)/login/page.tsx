"use client";

// frontend/app/(auth)/login/page.tsx

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth, getApiError } from "@/context/AuthContext";

// ── error code → human message ──────────────────────────────
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Incorrect email or password.",
  ACCOUNT_INACTIVE: "Your account has been deactivated. Contact support.",
  RATE_LIMIT_IP: "Too many attempts from your network. Wait 1 minute and try again.",
  RATE_LIMIT_ACCOUNT: "Too many failed attempts on this account. Wait 15 minutes.",
};

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const registered = searchParams.get("registered");

  // Only allow same-origin paths — prevent open redirect after login
  const redirectTo =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace(redirectTo);
    } catch (err) {
      const raw = getApiError(err);
      // Try to match a known error code embedded in the message
      const matched = Object.entries(ERROR_MESSAGES).find(([code]) =>
        raw.toUpperCase().includes(code)
      );
      setError(matched ? matched[1] : raw);
    } finally {
      setLoading(false);
    }
  };

  const isRateLimit = error.includes("Wait");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header band */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">M2i LMS</span>
        </div>
        <p className="text-blue-100 text-sm">Mentorship to Internship — Learning Platform</p>
      </div>

      <div className="px-8 py-7">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in to your account</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your credentials to continue</p>

        {registered && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-700">Account created successfully. Sign in to continue.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         disabled:bg-gray-50 disabled:text-gray-400 transition-shadow"
              disabled={loading}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-gray-50 disabled:text-gray-400 transition-shadow"
                disabled={loading}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          {error && (
            <div className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 ${
              isRateLimit
                ? "bg-amber-50 border-amber-200"
                : "bg-red-50 border-red-200"
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mt-0.5 shrink-0 ${isRateLimit ? "text-amber-600" : "text-red-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className={`text-sm ${isRateLimit ? "text-amber-700" : "text-red-700"}`}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                       disabled:bg-blue-400 text-white font-medium py-2.5 px-4
                       rounded-lg text-sm transition-colors duration-150 mt-1
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in…
              </>
            ) : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

// Dev credentials panel — visible when NEXT_PUBLIC_APP_ENV=development
function DevPanel() {
  const [open, setOpen] = useState(false);
  if (process.env.NEXT_PUBLIC_APP_ENV !== "development") return null;

  const accounts = [
    { label: "Super Admin", email: "superadmin@dev.com" },
    { label: "Admin", email: "admin@dev.com" },
    { label: "Mentor", email: "mentor@dev.com" },
    { label: "Mentor 2", email: "mentor2@dev.com" },
    { label: "Student 1", email: "student1@dev.com" },
    { label: "Student 2", email: "student2@dev.com" },
  ];

  return (
    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-amber-800 font-medium hover:bg-amber-100 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <span>🔧</span> Dev credentials
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-amber-200">
          <p className="text-amber-700 pt-2 pb-1.5">
            All passwords: <code className="font-mono bg-amber-100 px-1 rounded">ChangeMe123!</code>
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {accounts.map(({ label, email }) => (
              <div key={email}>
                <span className="text-amber-600">{label}:</span>{" "}
                <span className="text-amber-800 font-mono">{email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <DevPanel />
      </div>
    </div>
  );
}
