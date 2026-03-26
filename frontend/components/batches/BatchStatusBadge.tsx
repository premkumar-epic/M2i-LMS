// components/batches/BatchStatusBadge.tsx

import type { BatchStatus } from "@/lib/batch.api";

const statusConfig: Record<BatchStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Completed", className: "bg-blue-100 text-blue-700" },
  ARCHIVED: { label: "Archived", className: "bg-orange-100 text-orange-700" },
};

export default function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const { label, className } = statusConfig[status] ?? statusConfig.DRAFT;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
