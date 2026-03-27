// components/content/ContentStatusBadge.tsx

import type { TranscriptionStatus } from "@/lib/content.api";

interface Props {
  isPublished: boolean;
  transcriptionStatus: TranscriptionStatus;
  contentType: string;
}

export default function ContentStatusBadge({ isPublished, transcriptionStatus, contentType }: Props) {
  const needsTranscription = contentType === "VIDEO" || contentType === "LIVE_RECORDING";

  if (!isPublished) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        Draft
      </span>
    );
  }

  if (needsTranscription && transcriptionStatus === "PROCESSING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        Transcribing
      </span>
    );
  }

  if (needsTranscription && transcriptionStatus === "FAILED") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
        Transcription failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
      Published
    </span>
  );
}
