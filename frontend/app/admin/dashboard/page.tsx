"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/batches", label: "Batches", description: "Manage cohorts, enrollment, and mentors", icon: "🎓" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">{user?.full_name} · {user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Sign out
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all flex items-start gap-4"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
