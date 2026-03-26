// components/batches/BatchCard.tsx

import Link from "next/link";
import type { BatchSummary } from "@/lib/batch.api";
import BatchStatusBadge from "./BatchStatusBadge";

export default function BatchCard({ batch }: { batch: BatchSummary }) {
  return (
    <Link
      href={`/admin/batches/${batch.batch_id}`}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{batch.name}</h3>
        <BatchStatusBadge status={batch.status} />
      </div>

      {batch.description && (
        <p className="text-gray-500 text-xs mb-3 line-clamp-2">{batch.description}</p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-lg font-semibold text-gray-900">{batch.enrolled_students_count}</p>
          <p className="text-xs text-gray-500">Students</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-lg font-semibold text-gray-900">{batch.assigned_mentors_count}</p>
          <p className="text-xs text-gray-500">Mentors</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-lg font-semibold text-gray-900">
            {batch.current_week !== null ? `W${batch.current_week}` : "—"}
          </p>
          <p className="text-xs text-gray-500">Current</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{batch.start_date}</span>
        <span>→</span>
        <span>{batch.end_date}</span>
      </div>
    </Link>
  );
}
