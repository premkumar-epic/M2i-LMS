// components/content/ContentCard.tsx

import Link from "next/link";
import type { Content } from "@/lib/content.api";
import ContentStatusBadge from "./ContentStatusBadge";

const CONTENT_TYPE_ICON: Record<string, string> = {
  VIDEO: "🎬",
  DOCUMENT: "📄",
  RESOURCE: "🔗",
  LIVE_RECORDING: "📹",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  content: Content;
  href: string;
  /** Show mentor-only controls (publish/unpublish, edit) */
  mentorView?: boolean;
  completionPercentage?: number;
  onPublish?: () => void;
  onUnpublish?: () => void;
}

export default function ContentCard({
  content,
  href,
  mentorView = false,
  completionPercentage,
  onPublish,
  onUnpublish,
}: Props) {
  const icon = CONTENT_TYPE_ICON[content.content_type] ?? "📎";
  const duration = formatDuration(content.duration_seconds);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl leading-none flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <Link
              href={href}
              className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
            >
              {content.title}
            </Link>
            {content.description && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{content.description}</p>
            )}
          </div>
        </div>
        {mentorView && (
          <ContentStatusBadge
            isPublished={content.is_published}
            transcriptionStatus={content.transcription_status}
            contentType={content.content_type}
          />
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span>{content.content_type.replace("_", " ")}</span>
          {duration && <span>{duration}</span>}
          {content.topic_tags.length > 0 && (
            <span className="truncate max-w-[120px]">{content.topic_tags.join(", ")}</span>
          )}
        </div>

        {/* Student completion bar */}
        {!mentorView && completionPercentage !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span>{Math.round(completionPercentage)}%</span>
          </div>
        )}
      </div>

      {/* Mentor actions */}
      {mentorView && (
        <div className="flex gap-2 pt-1 border-t border-gray-50">
          <Link
            href={href}
            className="flex-1 text-center text-xs text-blue-600 hover:underline py-1"
          >
            Edit
          </Link>
          {content.is_published ? (
            <button
              onClick={onUnpublish}
              className="flex-1 text-xs text-amber-600 hover:underline py-1"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={onPublish}
              className="flex-1 text-xs text-green-600 hover:underline py-1"
            >
              Publish
            </button>
          )}
        </div>
      )}
    </div>
  );
}
