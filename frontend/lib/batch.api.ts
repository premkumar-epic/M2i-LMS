// frontend/lib/batch.api.ts
// All batch-related API calls.

import api from "./api";

// ── Types ────────────────────────────────────────────────────────────────────

export type BatchStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface BatchSummary {
  batch_id: string;
  name: string;
  description: string | null;
  status: BatchStatus;
  start_date: string;
  end_date: string;
  current_week: number | null;
  total_weeks: number;
  enrolled_students_count: number;
  assigned_mentors_count: number;
  created_at: string;
}

export interface BatchDetail extends BatchSummary {
  assigned_mentors: { mentor_id: string; full_name: string; email: string; avatar_url: string | null }[];
  content_count: number;
  live_sessions_count: number;
  created_by: { user_id: string; full_name: string };
  updated_at: string;
}

export interface BatchStudent {
  enrollment_id: string;
  student_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  enrollment_status: "ACTIVE" | "WITHDRAWN";
  enrolled_at: string;
  last_login_at: string | null;
  overall_progress_score: number | null;
}

export interface UserOption {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

// ── Batch CRUD ───────────────────────────────────────────────────────────────

export const listBatches = async (params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await api.get("/batches", { params });
  return res.data.data as {
    batches: BatchSummary[];
    pagination: { page: number; limit: number; total: number; total_pages: number };
  };
};

export const createBatch = async (data: {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
}) => {
  const res = await api.post("/batches", data);
  return res.data.data as BatchSummary;
};

export const getBatch = async (batchId: string) => {
  const res = await api.get(`/batches/${batchId}`);
  return res.data.data as BatchDetail;
};

export const updateBatch = async (
  batchId: string,
  data: { name?: string; description?: string | null; end_date?: string }
) => {
  const res = await api.put(`/batches/${batchId}`, data);
  return res.data.data as BatchSummary;
};

export const archiveBatch = async (batchId: string) => {
  const res = await api.post(`/batches/${batchId}/archive`, { confirmation: "ARCHIVE" });
  return res.data.data as { batch_id: string; status: string };
};

// ── Enrollment ───────────────────────────────────────────────────────────────

export const enrollStudents = async (batchId: string, studentIds: string[]) => {
  const res = await api.post(`/batches/${batchId}/enroll`, { student_ids: studentIds });
  return res.data.data as {
    enrolled: { student_id: string; full_name: string; enrolled_at: string }[];
    skipped: { student_id: string; reason: string }[];
    failed: { student_id: string; reason: string }[];
  };
};

export const withdrawStudent = async (batchId: string, studentId: string) => {
  const res = await api.delete(`/batches/${batchId}/enroll/${studentId}`);
  return res.data.data;
};

export const listBatchStudents = async (
  batchId: string,
  params?: { status?: string; search?: string; page?: number; limit?: number }
) => {
  const res = await api.get(`/batches/${batchId}/students`, { params });
  return res.data.data as {
    students: BatchStudent[];
    pagination: { page: number; limit: number; total: number; total_pages: number };
  };
};

// ── Mentors ──────────────────────────────────────────────────────────────────

export const assignMentors = async (batchId: string, mentorIds: string[]) => {
  const res = await api.post(`/batches/${batchId}/mentors`, { mentor_ids: mentorIds });
  return res.data.data;
};

// ── Users (for selectors) ────────────────────────────────────────────────────

export const listUsers = async (params: { role: "STUDENT" | "MENTOR"; search?: string; page?: number; limit?: number }) => {
  const res = await api.get("/users", { params });
  return res.data.data as {
    users: { id: string; full_name: string; email: string; avatar_url: string | null; role: string }[];
    pagination: { page: number; limit: number; total: number; total_pages: number };
  };
};
