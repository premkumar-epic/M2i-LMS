"use client";

// frontend/context/AuthContext.tsx
// Provides auth state and actions to the entire app.
// On mount, calls GET /api/auth/me to restore session.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import api from "@/lib/api";
import { AxiosError } from "axios";

// =========================================================
// TYPES
// =========================================================

export type AuthUser = {
  user_id: string;
  email: string;
  full_name: string;
  role: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

// =========================================================
// CONTEXT
// =========================================================

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

// =========================================================
// PROVIDER
// =========================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: AuthUser }>(
        "/auth/me"
      );
      setUser(res.data.data);
    } catch {
      setUser(null);
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    fetchMe().finally(() => setIsLoading(false));
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const res = await api.post<{ success: boolean; data: AuthUser }>(
      "/auth/login",
      { email, password }
    );
    setUser(res.data.data);
  }, []);

  const register = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ): Promise<void> => {
    await api.post("/auth/register", {
      full_name: fullName,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
    // Registration does not log in — user must login separately
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(fetchMe, [fetchMe]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Helper: extract error message from backend response
export const getApiError = (err: unknown): string => {
  if (err instanceof AxiosError) {
    return (
      (err.response?.data as { error?: { message?: string } })?.error
        ?.message ?? err.message
    );
  }
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred";
};
