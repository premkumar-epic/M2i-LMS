// frontend/app/layout.tsx
// Root layout — wraps the entire app with global providers.

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "M2i LMS",
  description: "Mentorship to Internship Learning Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
