"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function MentorDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">👨‍🏫</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Mentor Dashboard</h1>
        <p className="text-gray-500 text-sm mb-1">Signed in as <strong>{user?.full_name}</strong></p>
        <p className="text-gray-400 text-xs mb-6">{user?.email} · {user?.role}</p>
        <p className="text-gray-400 text-sm mb-6 italic">Coming soon — dashboard under construction.</p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
