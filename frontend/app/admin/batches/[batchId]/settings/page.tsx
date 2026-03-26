"use client";

// app/admin/batches/[batchId]/settings/page.tsx — Edit + archive batch

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getBatch, updateBatch, archiveBatch } from "@/lib/batch.api";
import type { BatchDetail } from "@/lib/batch.api";
import { getApiError } from "@/context/AuthContext";

export default function BatchSettingsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const router = useRouter();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [form, setForm] = useState({ name: "", description: "", end_date: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getBatch(batchId)
      .then((data) => {
        setBatch(data);
        setForm({ name: data.name, description: data.description ?? "", end_date: data.end_date });
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        setLoadError(status === 404 ? "Batch not found." : "Failed to load batch. Please refresh.");
      })
      .finally(() => setLoading(false));
  }, [batchId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      await updateBatch(batchId, {
        name: form.name,
        description: form.description || null,
        end_date: form.end_date,
      });
      setSuccess(true);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await archiveBatch(batchId);
      router.push("/admin/batches");
    } catch (err) {
      setError(getApiError(err));
      setShowArchiveConfirm(false);
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-lg mx-auto animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-48 bg-white border border-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{loadError ?? "Batch not found."}</p>
      </div>
    );
  }

  const isArchived = batch.status === "ARCHIVED";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <Link href={`/admin/batches/${batchId}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Batch
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-2">Batch Settings</h1>
          <p className="text-sm text-gray-500">{batch.name}</p>
        </div>

        {/* Edit form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 text-sm mb-4">Edit Details</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
              <input
                type="text"
                maxLength={100}
                required
                disabled={isArchived}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                maxLength={500}
                disabled={isArchived}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                required
                disabled={isArchived}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <p className="text-xs text-gray-400 mt-1">Start date ({batch.start_date}) cannot be changed.</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Batch updated successfully.
              </p>
            )}

            {!isArchived && (
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </form>
        </div>

        {/* Archive */}
        {!isArchived && (
          <div className="bg-white border border-red-100 rounded-2xl p-6">
            <h2 className="font-semibold text-red-700 text-sm mb-1">Archive Batch</h2>
            <p className="text-xs text-gray-500 mb-4">
              Archiving removes this batch from active views. All student progress data is preserved. This cannot be undone.
            </p>
            <button
              onClick={() => setShowArchiveConfirm(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
            >
              Archive Batch
            </button>
          </div>
        )}
      </div>

      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900 mb-2">Archive "{batch.name}"?</p>
            <p className="text-sm text-gray-500 mb-6">
              The batch will be removed from active views. Student data is preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {archiving ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
