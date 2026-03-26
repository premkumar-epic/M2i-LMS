// frontend/lib/api.ts
// Axios instance with automatic token refresh interceptor.
// All API calls in the app go through this instance.

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // Include HttpOnly cookies on every request
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================================================
// RESPONSE INTERCEPTOR — silent token refresh
// When the backend returns 401 TOKEN_EXPIRED, call the
// refresh endpoint and retry the original request once.
// =========================================================

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const drainQueue = (error: unknown) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(undefined);
    }
  });
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const errorCode = (error.response?.data as { error?: { code?: string } })
      ?.error?.code;

    // Only intercept expired access tokens — not other 401s
    if (
      error.response?.status === 401 &&
      errorCode === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then(() => {
          originalRequest._retry = true;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${BASE_URL}/api/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        drainQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        drainQueue(refreshError);
        // Refresh failed — redirect to login
        if (typeof window !== "undefined") {
          const redirect = encodeURIComponent(window.location.pathname);
          window.location.href = `/login?redirect=${redirect}`;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
