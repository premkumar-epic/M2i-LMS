"use client";

// components/batches/StudentTable.tsx

import { useState } from "react";
import type { BatchStudent } from "@/lib/batch.api";
import { withdrawStudent } from "@/lib/batch.api";

interface Props {
  batchId: string;
  students: BatchStudent[];
  onUpdate: () => void;
}

export default function StudentTable({ batchId, students, onUpdate }: Props) {
  const [confirmWithdraw, setConfirmWithdraw] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async (studentId: string) => {
    setWithdrawing(true);
    try {
      await withdrawStudent(batchId, studentId);
      onUpdate();
    } finally {
      setWithdrawing(false);
      setConfirmWithdraw(null);
    }
  };

  if (students.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No students enrolled yet.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Student</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Enrolled</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Last Login</th>
              <th className="py-2 px-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {students.map((s) => (
              <tr key={s.enrollment_id} className="hover:bg-gray-50">
                <td className="py-3 px-3">
                  <p className="font-medium text-gray-900">{s.full_name}</p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.enrollment_status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {s.enrollment_status === "ACTIVE" ? "Active" : "Withdrawn"}
                  </span>
                </td>
                <td className="py-3 px-3 text-gray-500 text-xs">
                  {new Date(s.enrolled_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-3 text-gray-500 text-xs">
                  {s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : "Never"}
                </td>
                <td className="py-3 px-3 text-right">
                  {s.enrollment_status === "ACTIVE" && (
                    <button
                      onClick={() => setConfirmWithdraw(s.student_id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Withdraw
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmWithdraw && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900 mb-2">Withdraw Student?</p>
            <p className="text-sm text-gray-500 mb-6">
              The student will lose access to this batch immediately. Their progress data is preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmWithdraw(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleWithdraw(confirmWithdraw)}
                disabled={withdrawing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {withdrawing ? "Withdrawing..." : "Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
