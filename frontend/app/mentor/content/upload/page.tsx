"use client";

// app/mentor/content/upload/page.tsx
// Mentor content upload page — drag-and-drop with react-dropzone.
// Uses local backend upload in dev; S3 pre-signed URL in production.

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as contentApi from "@/lib/content.api";

const ACCEPTED_TYPES: Record<string, string[]> = {
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
  "video/x-msvideo": [".avi"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
};

const IS_DEV = process.env.NEXT_PUBLIC_APP_ENV !== "production";

type UploadStatus = "idle" | "uploading" | "creating" | "done" | "error";

export default function UploadContentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const batchId = searchParams.get("batchId") ?? "";

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      if (!title) setTitle(accepted[0].name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
      setError("");
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024, // 500 MB
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !batchId || !title.trim()) return;
    setError("");

    try {
      setStatus("uploading");
      setProgress(0);

      let storageUrl: string;
      let cdnUrl: string | undefined;
      let fileSizeBytes: number | undefined = file.size;
      let contentId: string | undefined;

      if (IS_DEV) {
        // Local upload to backend
        const result = await contentApi.localUpload(file, setProgress);
        storageUrl = result.storage_url;
        cdnUrl = result.cdn_url;
        fileSizeBytes = result.file_size_bytes;
      } else {
        // S3 pre-signed URL upload — pass content_id back to createContent so the
        // DB record ID matches the UUID embedded in the S3 key path
        const uploadInfo = await contentApi.getUploadUrl(batchId, file.name, file.type);
        await contentApi.putToS3(uploadInfo.upload_url, file, setProgress);
        storageUrl = uploadInfo.s3_key;
        cdnUrl = uploadInfo.cdn_url;
        contentId = uploadInfo.content_id;
      }

      setStatus("creating");

      // Determine content type from MIME
      const isVideo = file.type.startsWith("video/");
      const contentType: contentApi.ContentType = isVideo ? "VIDEO" : "DOCUMENT";

      await contentApi.createContent({
        content_id: contentId,
        batch_id: batchId,
        title: title.trim(),
        description: description.trim() || undefined,
        content_type: contentType,
        storage_url: storageUrl,
        cdn_url: cdnUrl,
        file_size_bytes: fileSizeBytes,
        mime_type: file.type,
        topic_tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });

      setStatus("done");
      setTimeout(() => router.push(`/mentor/content?batchId=${batchId}`), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      setStatus("error");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Upload Content</h1>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-400 bg-blue-50"
              : file
              ? "border-green-400 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div>
              <p className="text-2xl mb-2">{file.type.startsWith("video/") ? "🎬" : "📄"}</p>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / (1024 * 1024)).toFixed(1)} MB · {file.type}
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="mt-2 text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <p className="text-3xl mb-3">📁</p>
              <p className="text-sm font-medium text-gray-700">
                {isDragActive ? "Drop the file here" : "Drag & drop a file, or click to browse"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Videos (MP4, WebM, MOV, AVI) or Documents (PDF, Word, PowerPoint) · Max 500 MB
              </p>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={255}
            placeholder="Enter a descriptive title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What will students learn from this content?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Topic Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="React, TypeScript, Node.js (comma-separated)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Progress bar */}
        {(status === "uploading" || status === "creating") && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{status === "uploading" ? "Uploading…" : "Creating record…"}</span>
              {status === "uploading" && <span>{progress}%</span>}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{ width: status === "creating" ? "100%" : `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Done */}
        {status === "done" && (
          <p className="text-sm text-green-600 font-medium">✓ Upload complete! Redirecting…</p>
        )}

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || !batchId || !title.trim() || status === "uploading" || status === "creating" || status === "done"}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "uploading" || status === "creating" ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
}
