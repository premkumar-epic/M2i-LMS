// frontend/lib/content.api.ts
// API client for /api/content and /api/batches/:batchId/content endpoints.

import api from "./api";

export type ContentType = "VIDEO" | "DOCUMENT" | "RESOURCE" | "LIVE_RECORDING";
export type TranscriptionStatus = "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED" | "NOT_REQUIRED";

export interface SupplementaryFile {
  file_id: string;
  filename: string;
  cdn_url: string | null;
  storage_url: string;
  file_size_bytes: string | null;
  mime_type: string | null;
  uploaded_at: string;
}

export interface Content {
  content_id: string;
  batch_id: string;
  uploaded_by: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  storage_url: string;
  cdn_url: string | null;
  duration_seconds: number | null;
  file_size_bytes: string | null;
  mime_type: string | null;
  topic_tags: string[];
  learning_objectives: string | null;
  transcription_status: TranscriptionStatus;
  transcript: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  supplementary_files?: SupplementaryFile[];
}

export interface WatchProgress {
  content_id: string;
  completion_percentage: number;
  is_completed: boolean;
}

export interface UploadResult {
  upload_url: string;
  s3_key: string;
  cdn_url: string;
  content_id: string;
}

export interface LocalUploadResult {
  filename: string;
  original_name: string;
  mime_type: string;
  file_size_bytes: number;
  storage_url: string;
  cdn_url: string;
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

/** Dev-only: upload a file to the local backend instead of S3. */
export const localUpload = async (
  file: File,
  onProgress?: (pct: number) => void
): Promise<LocalUploadResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<LocalUploadResult>("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return response.data;
};

/** Prod: get a pre-signed S3 upload URL then PUT the file to it. */
export const getUploadUrl = async (
  batchId: string,
  filename: string,
  mimeType: string
): Promise<UploadResult> => {
  const { data } = await api.post<UploadResult>("/content/upload-url", {
    batch_id: batchId,
    filename,
    mime_type: mimeType,
  });
  return data;
};

export const putToS3 = async (
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });
    }
    xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`S3 PUT failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("S3 PUT network error"));
    xhr.send(file);
  });
};

// ─── Content CRUD ─────────────────────────────────────────────────────────────

export const createContent = async (data: {
  batch_id: string;
  title: string;
  description?: string;
  content_type: ContentType;
  storage_url: string;
  cdn_url?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  mime_type?: string;
  topic_tags?: string[];
  learning_objectives?: string;
}): Promise<Content> => {
  const { data: content } = await api.post<Content>("/content", data);
  return content;
};

export const listBatchContent = async (batchId: string): Promise<Content[]> => {
  const { data } = await api.get<{ content: Content[]; total: number }>(
    `/batches/${batchId}/content`
  );
  return data.content;
};

export const getContent = async (contentId: string): Promise<Content> => {
  const { data } = await api.get<Content>(`/content/${contentId}`);
  return data;
};

export const updateContent = async (
  contentId: string,
  updates: {
    title?: string;
    description?: string | null;
    topic_tags?: string[];
    learning_objectives?: string | null;
  }
): Promise<Content> => {
  const { data } = await api.put<Content>(`/content/${contentId}`, updates);
  return data;
};

export const publishContent = async (contentId: string): Promise<Content> => {
  const { data } = await api.post<Content>(`/content/${contentId}/publish`);
  return data;
};

export const unpublishContent = async (contentId: string): Promise<Content> => {
  const { data } = await api.post<Content>(`/content/${contentId}/unpublish`);
  return data;
};

export const deleteContent = async (contentId: string): Promise<void> => {
  await api.delete(`/content/${contentId}`);
};

export const reorderContent = async (
  batchId: string,
  items: { content_id: string; sort_order: number }[]
): Promise<void> => {
  await api.put("/content/reorder", { batch_id: batchId, items });
};

// ─── Transcript ───────────────────────────────────────────────────────────────

export const getTranscript = async (
  contentId: string
): Promise<{ content_id: string; transcript: string | null; transcription_status: TranscriptionStatus }> => {
  const { data } = await api.get(`/content/${contentId}/transcript`);
  return data;
};

export const updateTranscript = async (
  contentId: string,
  transcript: string
): Promise<{ content_id: string; transcript: string; transcription_status: TranscriptionStatus }> => {
  const { data } = await api.put(`/content/${contentId}/transcript`, { transcript });
  return data;
};

// ─── Watch progress ───────────────────────────────────────────────────────────

export const updateWatchProgress = async (
  contentId: string,
  positionSeconds: number,
  watchTimeDeltaSeconds: number
): Promise<WatchProgress> => {
  const { data } = await api.patch<WatchProgress>(`/content/${contentId}/progress`, {
    position_seconds: positionSeconds,
    watch_time_delta_seconds: watchTimeDeltaSeconds,
  });
  return data;
};

// ─── Supplementary files ──────────────────────────────────────────────────────

export const getFileUploadUrl = async (
  contentId: string,
  filename: string,
  mimeType: string
): Promise<{ upload_url: string; s3_key: string; cdn_url: string; file_id: string }> => {
  const { data } = await api.post(`/content/${contentId}/files/upload-url`, {
    filename,
    mime_type: mimeType,
  });
  return data;
};

export const createSupplementaryFile = async (
  contentId: string,
  data: {
    filename: string;
    storage_url: string;
    cdn_url?: string;
    file_size_bytes?: number;
    mime_type?: string;
  }
): Promise<SupplementaryFile> => {
  const { data: file } = await api.post<SupplementaryFile>(`/content/${contentId}/files`, data);
  return file;
};

export const deleteSupplementaryFile = async (contentId: string, fileId: string): Promise<void> => {
  await api.delete(`/content/${contentId}/files/${fileId}`);
};
