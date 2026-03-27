"use client";

// app/mentor/dashboard/page.tsx
// Mentor dashboard — shows assigned batches and quick links.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as batchApi from "@/lib/batch.api";
import type { MyBatchSummary } from "@/lib/batch.api";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
};

export default function MentorDashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<MyBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await batchApi.getMyBatches();
      setBatches(data);
    } catch {
      setError("Failed to load your batches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Mentor Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.full_name}</p>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Your Batches</h2>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-8">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <button onClick={() => void load()} className="text-sm text-blue-600 hover:underline">Retry</button>
        </div>
      )}

      {!loading && !error && batches.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm">You have not been assigned to any batch yet.</p>
        </div>
      )}

      {!loading && !error && batches.length > 0 && (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div key={batch.batch_id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-gray-900 truncate">{batch.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[batch.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABEL[batch.status] ?? batch.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {batch.enrolled_students_count} student{batch.enrolled_students_count !== 1 ? "s" : ""}
                  {batch.current_week !== null && ` · Week ${batch.current_week} of ${batch.total_weeks}`}
                </p>
              </div>
              <Link
                href={`/mentor/content?batchId=${batch.batch_id}`}
                className="ml-4 shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Content Library →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
