"use client";

// app/student/dashboard/page.tsx
// Student dashboard — shows enrolled batch and quick link to content library.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as batchApi from "@/lib/batch.api";
import type { MyStudentBatch } from "@/lib/batch.api";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [batch, setBatch] = useState<MyStudentBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await batchApi.getMyBatch();
      setBatch(data);
    } catch (err) {
      // Distinguish "not enrolled" (404) from unexpected errors
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 404 ? "not-enrolled" : "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Student Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.full_name}</p>
      </div>

      {loading && (
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      )}

      {!loading && error === "not-enrolled" && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-3">🎓</p>
          <p className="text-sm">You are not enrolled in any active batch yet.</p>
          <p className="text-xs mt-1">Contact your admin to get enrolled.</p>
        </div>
      )}

      {!loading && error === "error" && (
        <div className="text-center py-12">
          <p className="text-sm text-red-600 mb-2">Failed to load your batch. Please try again.</p>
          <button onClick={() => void load()} className="text-sm text-blue-600 hover:underline">Retry</button>
        </div>
      )}

      {!loading && batch && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-gray-900 text-lg truncate">{batch.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[batch.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {batch.status}
                </span>
              </div>
              {batch.description && (
                <p className="text-sm text-gray-500 leading-relaxed">{batch.description}</p>
              )}
            </div>
          </div>

          {/* Progress info */}
          {batch.current_week !== null && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Week {batch.current_week} of {batch.total_weeks}</span>
                <span>{batch.weeks_remaining ?? 0} week{batch.weeks_remaining !== 1 ? "s" : ""} remaining</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((batch.current_week / batch.total_weeks) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Mentors */}
          {batch.assigned_mentors.length > 0 && (
            <p className="text-xs text-gray-500 mb-4">
              Mentor{batch.assigned_mentors.length > 1 ? "s" : ""}: {batch.assigned_mentors.map((m) => m.full_name).join(", ")}
            </p>
          )}

          <Link
            href={`/student/content?batchId=${batch.batch_id}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Content Library →
          </Link>
        </div>
      )}
    </div>
  );
}
