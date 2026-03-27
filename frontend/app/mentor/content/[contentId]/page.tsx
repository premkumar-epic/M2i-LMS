"use client";

// app/mentor/content/[contentId]/page.tsx
// Mentor content detail — edit metadata, view transcription status, manage supplementary files.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import * as contentApi from "@/lib/content.api";
import type { Content } from "@/lib/content.api";
import ContentStatusBadge from "@/components/content/ContentStatusBadge";

export default function MentorContentDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchId = searchParams.get("batchId") ?? "";

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  // Edit form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await contentApi.getContent(contentId);
      setContent(data);
      setTitle(data.title);
      setDescription(data.description ?? "");
      setTags(data.topic_tags.join(", "));
      setLearningObjectives(data.learning_objectives ?? "");
    } catch {
      setError("Failed to load content.");
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;
    setSaving(true);
    setSaveError("");
    try {
      const updated = await contentApi.updateContent(contentId, {
        title: title.trim(),
        description: description.trim() || null,
        topic_tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        learning_objectives: learningObjectives.trim() || null,
      });
      setContent(updated);
    } catch {
      setSaveError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!content) return;
    try {
      const updated = await contentApi.publishContent(contentId);
      setContent(updated);
    } catch { alert("Failed to publish."); }
  };

  const handleUnpublish = async () => {
    if (!content) return;
    try {
      const updated = await contentApi.unpublishContent(contentId);
      setContent(updated);
    } catch { alert("Failed to unpublish."); }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse"><div className="h-8 bg-gray-100 rounded w-1/2 mb-4" /><div className="h-48 bg-gray-100 rounded" /></div>;
  if (error) return <div className="max-w-2xl mx-auto px-4 py-8"><p className="text-sm text-red-600">{error}</p></div>;
  if (!content) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/mentor/content?batchId=${batchId}`)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-xl font-semibold text-gray-900 truncate flex-1">{content.title}</h1>
        <ContentStatusBadge isPublished={content.is_published} transcriptionStatus={content.transcription_status} contentType={content.content_type} />
      </div>

      {/* Publish controls */}
      <div className="flex gap-3 mb-6">
        {content.is_published ? (
          <button onClick={() => void handleUnpublish()} className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100">
            Unpublish
          </button>
        ) : (
          <button onClick={() => void handlePublish()} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            Publish
          </button>
        )}
        <a href={content.cdn_url ?? content.storage_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          Preview ↗
        </a>
      </div>

      {/* Transcription status */}
      {(content.content_type === "VIDEO" || content.content_type === "LIVE_RECORDING") && (
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
          <p className="font-medium text-gray-700">Transcription Status</p>
          <p className="text-gray-500 mt-0.5 capitalize">{content.transcription_status.toLowerCase().replace("_", " ")}</p>
          {content.transcription_status === "COMPLETE" && content.transcript && (
            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600 text-xs">View transcript</summary>
              <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">{content.transcript}</pre>
            </details>
          )}
        </div>
      )}

      {/* Edit form */}
      <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="React, TypeScript (comma-separated)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Learning Objectives</label>
          <textarea
            value={learningObjectives}
            onChange={(e) => setLearningObjectives(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What should students be able to do after watching this?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {saveError && <p className="text-sm text-red-600">{saveError}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Supplementary files */}
      {content.supplementary_files && content.supplementary_files.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Supplementary Files</h2>
          <div className="space-y-2">
            {content.supplementary_files.map((f) => (
              <div key={f.file_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{f.filename}</p>
                  {f.file_size_bytes && <p className="text-xs text-gray-400">{(Number(f.file_size_bytes) / 1024).toFixed(0)} KB</p>}
                </div>
                <a href={f.cdn_url ?? f.storage_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
