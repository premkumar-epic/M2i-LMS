"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin/batches", label: "Batches", description: "Manage cohorts, enrollment, and mentors", icon: "🎓" },
  { href: "/admin/users", label: "Users", description: "Create and manage user accounts and roles", icon: "👤" },
];

export default function AdminDashboard() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Admin Dashboard</h1>

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
  );
}
