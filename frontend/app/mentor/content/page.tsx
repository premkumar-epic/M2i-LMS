"use client";

// app/mentor/content/page.tsx
// Mentor content library — shows all content (published + draft) for a batch.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import * as contentApi from "@/lib/content.api";
import type { Content } from "@/lib/content.api";
import ContentCard from "@/components/content/ContentCard";

export default function MentorContentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchId = searchParams.get("batchId") ?? "";

  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError("");
    try {
      const data = await contentApi.listBatchContent(batchId);
      setItems(data);
    } catch {
      setError("Failed to load content.");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { void load(); }, [load]);

  const handlePublish = async (contentId: string) => {
    try {
      const updated = await contentApi.publishContent(contentId);
      setItems((prev) => prev.map((c) => (c.content_id === contentId ? updated : c)));
    } catch {
      alert("Failed to publish.");
    }
  };

  const handleUnpublish = async (contentId: string) => {
    try {
      const updated = await contentApi.unpublishContent(contentId);
      setItems((prev) => prev.map((c) => (c.content_id === contentId ? updated : c)));
    } catch {
      alert("Failed to unpublish.");
    }
  };

  if (!batchId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">No batch selected. Go to your dashboard and select a batch.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Content Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">All content in this batch</p>
        </div>
        <Link
          href={`/mentor/content/upload?batchId=${batchId}`}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Upload
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-12">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={() => void load()} className="text-sm text-blue-600 hover:underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm">No content yet.</p>
          <Link
            href={`/mentor/content/upload?batchId=${batchId}`}
            className="mt-3 inline-block text-sm text-blue-600 hover:underline"
          >
            Upload your first video
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((content) => (
            <ContentCard
              key={content.content_id}
              content={content}
              href={`/mentor/content/${content.content_id}?batchId=${batchId}`}
              mentorView
              onPublish={() => void handlePublish(content.content_id)}
              onUnpublish={() => void handleUnpublish(content.content_id)}
            />
          ))}
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
