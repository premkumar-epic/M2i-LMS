"use client";

// frontend/app/pending-role/page.tsx
// Shown when the user is authenticated but has no role yet.
// Admin must assign a role before the user can proceed.

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function PendingRolePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Account pending activation
          </h2>
          <p className="text-gray-500 text-sm mb-1">
            Signed in as <strong>{user?.email}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Your account has been created but a role has not been assigned yet.
            Please contact your platform admin to complete setup.
          </p>
          <button
            onClick={handleLogout}
            className="text-sm text-blue-600 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
