"use client";

// components/batches/AssignMentorsModal.tsx

import { useState, useEffect, useCallback } from "react";
import { listUsers, assignMentors } from "@/lib/batch.api";
import { getApiError } from "@/context/AuthContext";

interface Props {
  batchId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function AssignMentorsModal({ batchId, onSuccess, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (q: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await listUsers({ role: "MENTOR", search: q || undefined, limit: 50 });
      setUsers(res.users);
    } catch {
      setFetchError("Failed to load mentors. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await assignMentors(batchId, Array.from(selected));
      onSuccess();
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Assign Mentors</h2>
          <p className="text-xs text-gray-500 mt-0.5">Select mentors to assign to this batch.</p>
        </div>

        <div className="p-5 space-y-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
            {loading ? (
              <p className="text-xs text-gray-400 text-center py-4">Loading...</p>
            ) : fetchError ? (
              <p className="text-xs text-red-500 text-center py-4">{fetchError}</p>
            ) : users.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No mentors found.</p>
            ) : (
              users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>

          {selected.size > 0 && (
            <p className="text-xs text-blue-600 font-medium">{selected.size} mentor(s) selected</p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Assigning..." : `Assign ${selected.size > 0 ? selected.size : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
