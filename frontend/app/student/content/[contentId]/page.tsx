"use client";

// app/student/content/[contentId]/page.tsx
// Student content detail — video player with 30-second watch progress heartbeat.

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import * as contentApi from "@/lib/content.api";
import type { Content } from "@/lib/content.api";

// react-player uses browser APIs — must be dynamically imported to avoid SSR issues.
// react-player v3 uses forwardRef<HTMLVideoElement> so no lazy sub-export is needed.
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const HEARTBEAT_INTERVAL_MS = 30_000;

export default function StudentContentDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchId = searchParams.get("batchId") ?? "";

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Player state
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<{ seekTo: (amount: number, type: string) => void } | null>(null);
  const lastPositionRef = useRef(0);
  const watchTimeDeltaRef = useRef(0);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [completionPct, setCompletionPct] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [data, progress] = await Promise.all([
        contentApi.getContent(contentId),
        contentApi.getWatchProgress(contentId).catch(() => null),
      ]);
      setContent(data);
      if (progress) {
        setCompletionPct(progress.completion_percentage);
        lastPositionRef.current = progress.last_position_seconds;
      }
    } catch {
      setError("Failed to load content.");
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => { void load(); }, [load]);

  // Heartbeat — send progress every 30 seconds while playing
  const sendProgress = useCallback(async () => {
    const delta = watchTimeDeltaRef.current;
    if (delta === 0) return;
    const position = lastPositionRef.current;
    watchTimeDeltaRef.current = 0;
    try {
      const result = await contentApi.updateWatchProgress(contentId, Math.floor(position), Math.floor(delta));
      setCompletionPct(result.completion_percentage);
    } catch {
      // non-fatal — progress will be sent on next heartbeat
    }
  }, [contentId]);

  useEffect(() => {
    if (playing) {
      heartbeatTimerRef.current = setInterval(() => {
        void sendProgress();
      }, HEARTBEAT_INTERVAL_MS);
    } else {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    }
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [playing, sendProgress]);

  // Flush progress when leaving the page
  useEffect(() => {
    return () => {
      void sendProgress();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // onProgress fires every second via react-player's documented API; accumulate real watch time, skip seeks (delta > 5s)
  const handleProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    const delta = playedSeconds - lastPositionRef.current;
    if (delta > 0 && delta < 5) watchTimeDeltaRef.current += delta;
    lastPositionRef.current = playedSeconds;
  };

  // Resume from last watched position when player is ready
  const handleReady = useCallback(() => {
    if (lastPositionRef.current > 0) {
      playerRef.current?.seekTo(lastPositionRef.current, "seconds");
    }
  }, []);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse"><div className="aspect-video bg-gray-100 rounded-xl mb-4" /></div>;
  if (error) return <div className="max-w-3xl mx-auto px-4 py-8"><p className="text-sm text-red-600">{error}</p></div>;
  if (!content) return null;

  const videoUrl = content.cdn_url ?? content.storage_url;
  const isVideo = content.content_type === "VIDEO" || content.content_type === "LIVE_RECORDING";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push(`/student/content?batchId=${batchId}`)} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-xl font-semibold text-gray-900 truncate flex-1">{content.title}</h1>
      </div>

      {/* Video player */}
      {isVideo && (
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4">
          <ReactPlayer
            ref={playerRef as React.Ref<unknown>}
            src={videoUrl}
            width="100%"
            height="100%"
            controls
            playing={playing}
            onReady={handleReady}
            onPlay={() => setPlaying(true)}
            onPause={() => { setPlaying(false); void sendProgress(); }}
            onEnded={() => { setPlaying(false); void sendProgress(); }}
            onProgress={handleProgress}
          />
        </div>
      )}

      {/* Non-video content — link to file */}
      {!isVideo && (
        <div className="bg-gray-50 rounded-xl p-6 mb-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{content.title}</p>
            <p className="text-sm text-gray-500 mt-0.5">{content.content_type.replace("_", " ").toLowerCase()}</p>
          </div>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Open ↗
          </a>
        </div>
      )}

      {/* Progress bar */}
      {isVideo && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
          </div>
          <span className="text-xs text-gray-500">{Math.round(completionPct)}% complete</span>
        </div>
      )}

      {/* Description */}
      {content.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{content.description}</p>
        </div>
      )}

      {/* Learning objectives */}
      {content.learning_objectives && (
        <div className="bg-blue-50 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Learning Objectives</p>
          <p className="text-sm text-blue-900 leading-relaxed">{content.learning_objectives}</p>
        </div>
      )}

      {/* Tags */}
      {content.topic_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {content.topic_tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Supplementary files */}
      {content.supplementary_files && content.supplementary_files.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Resources</h2>
          <div className="space-y-2">
            {content.supplementary_files.map((f) => (
              <a
                key={f.file_id}
                href={f.cdn_url ?? f.storage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm text-gray-900">{f.filename}</span>
                <span className="text-xs text-blue-600">Download ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
