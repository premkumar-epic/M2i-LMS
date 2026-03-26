"use client";

import { useAuth } from "@/context/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md text-center">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🎓</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Student Dashboard</h1>
        <p className="text-gray-500 text-sm mb-1">Signed in as <strong>{user?.full_name}</strong></p>
        <p className="text-gray-400 text-xs mb-6">{user?.email}</p>
        <p className="text-gray-400 text-sm italic">Coming soon — dashboard under construction.</p>
      </div>
    </div>
  );
}
