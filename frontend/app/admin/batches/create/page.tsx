// app/admin/batches/create/page.tsx — Create batch page

import Link from "next/link";
import CreateBatchForm from "@/components/batches/CreateBatchForm";

export default function CreateBatchPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/admin/batches" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Batches
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-2">Create Batch</h1>
          <p className="text-sm text-gray-500">Define a new student cohort.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <CreateBatchForm />
        </div>
      </div>
    </div>
  );
}
