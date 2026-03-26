"use client";

// app/admin/users/page.tsx
// Admin user management — list, create, edit, reset password.

import { useState, useEffect, useCallback } from "react";
import {
  listUsers,
  createUser,
  updateUser,
  resetUserPassword,
} from "@/lib/user.api";
import type { UserRow } from "@/lib/user.api";
import { getApiError } from "@/context/AuthContext";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLES = ["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"];

const ROLE_FILTERS = [
  { label: "All roles", value: "" },
  { label: "Student", value: "STUDENT" },
  { label: "Mentor", value: "MENTOR" },
  { label: "Admin", value: "ADMIN" },
  { label: "Super Admin", value: "SUPER_ADMIN" },
];

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "bg-blue-50 text-blue-700",
  MENTOR: "bg-green-50 text-green-700",
  ADMIN: "bg-purple-50 text-purple-700",
  SUPER_ADMIN: "bg-red-50 text-red-700",
};

// ─── Create User Modal ────────────────────────────────────────────────────────

type CreateResult = UserRow & { temporary_password: string };

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (result: CreateResult) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await createUser({ full_name: fullName, email, role });
      onCreated(result);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Create User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Temp Password Modal ──────────────────────────────────────────────────────

function TempPasswordModal({
  user,
  password,
  onClose,
}: {
  user: { full_name: string; email: string };
  password: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-xl">🔑</span>
        </div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Temporary Password
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Share this with <strong>{user.full_name}</strong> ({user.email})
        </p>
        <div className="bg-gray-100 rounded-lg px-4 py-3 mb-4">
          <code className="text-sm font-mono font-semibold text-gray-900 select-all">
            {password}
          </code>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          This password will not be shown again.
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({
  user,
  onClose,
  onUpdated,
}: {
  user: UserRow;
  onClose: () => void;
  onUpdated: (updated: UserRow) => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState(user.role ?? "STUDENT");
  const [isActive, setIsActive] = useState(user.is_active);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateUser(user.user_id, {
        full_name: fullName,
        role,
        is_active: isActive,
      });
      onUpdated(updated);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Edit User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="text"
              disabled
              value={user.email}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="is_active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active account
            </label>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [tempPassword, setTempPassword] = useState<{
    user: { full_name: string; email: string };
    password: string;
  } | null>(null);

  // Per-row reset state — null = idle, string = userId being reset
  const [resettingId, setResettingId] = useState<string | null>(null);
  // Confirmation step before resetting: stores the user awaiting confirmation
  const [confirmResetUser, setConfirmResetUser] = useState<UserRow | null>(null);
  // Inline error for reset password failures (replaces alert())
  const [resetError, setResetError] = useState<string | null>(null);

  const loadUsers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        page: 1,
        limit: 50,
        signal,
      });
      setUsers(res.users);
      setTotal(res.pagination.total);
      setLoading(false);
    } catch (err) {
      // Ignore cancellations — a newer request is already in flight;
      // do NOT clear loading so the spinner stays until the fresh result arrives.
      if (err instanceof Error && err.name === "CanceledError") return;
      setError(getApiError(err));
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => loadUsers(controller.signal), 300);
    // Cancel both the timeout and any in-flight request when deps change
    return () => { clearTimeout(t); controller.abort(); };
  }, [loadUsers]);

  const handleCreated = (result: CreateResult) => {
    setShowCreate(false);
    setTempPassword({ user: result, password: result.temporary_password });
    // Reload from server so the list respects active search/role filters
    // and the total count is accurate rather than blindly incrementing.
    void loadUsers();
  };

  const handleUpdated = (_updated: UserRow) => {
    setEditUser(null);
    // Reload from server so active search/role filters are re-applied —
    // a role change would otherwise leave a stale row under the wrong filter.
    void loadUsers();
  };

  // Step 1: user clicks "Reset PW" → show inline confirmation
  const handleResetPasswordClick = (user: UserRow) => {
    setConfirmResetUser(user);
    setResetError(null);
  };

  // Step 2: user confirms → execute the reset
  const handleResetPasswordConfirm = async () => {
    if (!confirmResetUser) return;
    setResettingId(confirmResetUser.user_id);
    setResetError(null);
    try {
      const result = await resetUserPassword(confirmResetUser.user_id);
      setConfirmResetUser(null);
      setTempPassword({ user: confirmResetUser, password: result.temporary_password });
    } catch (err) {
      setResetError(getApiError(err));
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Create User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ROLE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={() => loadUsers()}
            className="text-sm text-blue-600 underline"
          >
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No users found.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {user.full_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.role ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {user.role}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No role</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditUser(user)}
                        className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleResetPasswordClick(user)}
                        disabled={resettingId === user.user_id}
                        className="px-3 py-1 text-xs font-medium text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 transition-colors"
                      >
                        {resettingId === user.user_id ? "Resetting…" : "Reset PW"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={handleUpdated}
        />
      )}
      {tempPassword && (
        <TempPasswordModal
          user={tempPassword.user}
          password={tempPassword.password}
          onClose={() => setTempPassword(null)}
        />
      )}

      {/* Reset password confirmation modal */}
      {confirmResetUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              Reset password?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              This will immediately invalidate all sessions for{" "}
              <strong>{confirmResetUser.full_name}</strong> and generate a new
              temporary password. This cannot be undone.
            </p>
            {resetError && (
              <p className="text-xs text-red-600 mb-3">{resetError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setConfirmResetUser(null); setResetError(null); }}
                disabled={resettingId === confirmResetUser.user_id}
                className="flex-1 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPasswordConfirm}
                disabled={resettingId === confirmResetUser.user_id}
                className="flex-1 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {resettingId === confirmResetUser.user_id ? "Resetting…" : "Yes, reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
