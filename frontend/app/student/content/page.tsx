"use client";

// app/student/content/page.tsx
// Student content library — shows published content for the enrolled batch.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as contentApi from "@/lib/content.api";
import type { Content } from "@/lib/content.api";
import ContentCard from "@/components/content/ContentCard";

export default function StudentContentPage() {
  const searchParams = useSearchParams();
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

  if (!batchId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500">
          No batch selected. Go to your dashboard to see your enrolled batch.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Content Library</h1>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
          <p className="text-sm">No content available yet. Check back soon.</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((content) => (
            <ContentCard
              key={content.content_id}
              content={content}
              href={`/student/content/${content.content_id}?batchId=${batchId}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
