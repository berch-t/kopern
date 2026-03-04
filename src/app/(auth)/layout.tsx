"use client";

import { AuthProvider } from "@/providers/AuthProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen items-center justify-center bg-background">
        {children}
      </div>
    </AuthProvider>
  );
}
