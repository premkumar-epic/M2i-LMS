// app/admin/layout.tsx
// Wraps all /admin/* pages with the shared NavHeader.

import NavHeader from "@/components/NavHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <main>{children}</main>
    </div>
  );
}
