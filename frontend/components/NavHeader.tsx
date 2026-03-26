"use client";

// components/NavHeader.tsx
// Shared navigation header used across all role dashboards.
// Shows app name, current user info, a placeholder notification bell, and sign out.

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function NavHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <span className="text-sm font-semibold text-gray-900 tracking-tight">
        M2i LMS
      </span>

      <div className="flex items-center gap-4">
        {/* Notification bell — placeholder until F10 is implemented */}
        <button
          aria-label="Notifications"
          className="relative p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </button>

        {/* User info */}
        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-gray-900 leading-none">
              {user.full_name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{user.role}</p>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
