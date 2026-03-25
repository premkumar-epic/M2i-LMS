// frontend/app/page.tsx
// Root page — middleware handles the actual redirect to /login
// or role dashboard. This page is a fallback only.

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
