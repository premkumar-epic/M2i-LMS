// frontend/lib/user.api.ts
// API client functions for /api/users endpoints (admin only).

import api from "./api";

export type UserRow = {
  user_id: string;
  email: string;
  full_name: string;
  role: string | null;
  is_active: boolean;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type ListUsersParams = {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
};

export const listUsers = async (
  params: ListUsersParams = {}
): Promise<{ users: UserRow[]; pagination: Pagination }> => {
  const res = await api.get<{
    success: boolean;
    users: UserRow[];
    pagination: Pagination;
  }>("/users", { params: { page: 1, limit: 20, ...params } });
  return { users: res.data.users, pagination: res.data.pagination };
};

export const createUser = async (input: {
  full_name: string;
  email: string;
  role: string;
}): Promise<UserRow & { temporary_password: string }> => {
  const res = await api.post<{
    success: boolean;
    data: UserRow & { temporary_password: string };
  }>("/users", input);
  return res.data.data;
};

export const updateUser = async (
  userId: string,
  input: { full_name?: string; role?: string; is_active?: boolean }
): Promise<UserRow> => {
  const res = await api.put<{ success: boolean; data: UserRow }>(
    `/users/${userId}`,
    input
  );
  return res.data.data;
};

export const resetUserPassword = async (
  userId: string
): Promise<{ temporary_password: string }> => {
  const res = await api.post<{
    success: boolean;
    data: { temporary_password: string };
  }>(`/users/${userId}/reset-password`);
  return res.data.data;
};
