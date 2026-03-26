"use client";

// app/admin/batches/[batchId]/page.tsx — Batch detail page

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getBatch, listBatchStudents } from "@/lib/batch.api";
import type { BatchDetail, BatchStudent } from "@/lib/batch.api";
import BatchStatusBadge from "@/components/batches/BatchStatusBadge";
import StudentTable from "@/components/batches/StudentTable";
import EnrollStudentsModal from "@/components/batches/EnrollStudentsModal";
import AssignMentorsModal from "@/components/batches/AssignMentorsModal";

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [showAssignMentor, setShowAssignMentor] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentFilter, setStudentFilter] = useState("");

  const [batchError, setBatchError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    try {
      const data = await getBatch(batchId);
      setBatch(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setBatchError(status === 404 ? "Batch not found." : "Failed to load batch. Please refresh.");
    }
  }, [batchId]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await listBatchStudents(batchId, {
        search: studentSearch || undefined,
        status: studentFilter || undefined,
        page: 1,
        limit: 50,
      });
      setStudents(res.students);
    } catch {
      // ignore
    }
  }, [batchId, studentSearch, studentFilter]);

  // Initial load — fetch batch details once on mount
  useEffect(() => {
    fetchBatch().finally(() => setLoading(false));
  }, [fetchBatch]);

  // Debounced student list — runs on mount and whenever search/filter/batchId changes.
  // Depends on primitive values, not the callback, so it fires exactly once per change.
  useEffect(() => {
    const t = setTimeout(() => { void fetchStudents(); }, 300);
    return () => clearTimeout(t);
  }, [batchId, studentSearch, studentFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-white border border-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{batchError ?? "Batch not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb + header */}
        <div>
          <Link href="/admin/batches" className="text-sm text-gray-500 hover:text-gray-700">
            ← Batches
          </Link>
          <div className="flex items-start justify-between mt-2 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">{batch.name}</h1>
                <BatchStatusBadge status={batch.status} />
              </div>
              {batch.description && (
                <p className="text-sm text-gray-500 mt-1">{batch.description}</p>
              )}
            </div>
            <Link
              href={`/admin/batches/${batchId}/settings`}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Students", value: batch.enrolled_students_count },
            { label: "Mentors", value: batch.assigned_mentors_count },
            { label: "Content", value: batch.content_count },
            {
              label: "Week",
              value: batch.current_week !== null ? `${batch.current_week} / ${batch.total_weeks}` : `${batch.total_weeks} wks`,
            },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Start Date</p>
            <p className="font-medium text-gray-900">{batch.start_date}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">End Date</p>
            <p className="font-medium text-gray-900">{batch.end_date}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Created By</p>
            <p className="font-medium text-gray-900">{batch.created_by.full_name}</p>
          </div>
        </div>

        {/* Mentors */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Assigned Mentors</h2>
            {batch.status !== "ARCHIVED" && (
              <button
                onClick={() => setShowAssignMentor(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Assign
              </button>
            )}
          </div>
          {batch.assigned_mentors.length === 0 ? (
            <p className="text-sm text-gray-400">No mentors assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {batch.assigned_mentors.map((m) => (
                <div
                  key={m.mentor_id}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5"
                >
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-semibold text-blue-700">
                    {m.full_name[0]}
                  </div>
                  <span className="text-sm text-gray-800">{m.full_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Students */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm">Students</h2>
            {batch.status !== "ARCHIVED" && (
              <button
                onClick={() => setShowEnroll(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Enroll
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search students..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>

          <StudentTable
            batchId={batchId}
            students={students}
            onUpdate={() => { fetchBatch(); fetchStudents(); }}
          />
        </div>
      </div>

      {showEnroll && (
        <EnrollStudentsModal
          batchId={batchId}
          onSuccess={() => { fetchBatch(); fetchStudents(); }}
          onClose={() => setShowEnroll(false)}
        />
      )}
      {showAssignMentor && (
        <AssignMentorsModal
          batchId={batchId}
          onSuccess={fetchBatch}
          onClose={() => setShowAssignMentor(false)}
        />
      )}
    </div>
  );
}
