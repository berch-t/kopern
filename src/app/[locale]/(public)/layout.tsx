"use client";

import { useEffect, useState, useCallback } from "react";
import { type User } from "firebase/auth";
import { onAuthChanged } from "@/lib/firebase/auth";
import { AuthProvider } from "@/providers/AuthProvider";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";
import { SharedNavbar } from "@/components/layout/SharedNavbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useDictionary();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Authenticated: wrap in dashboard chrome (sidebar + header)
  if (!loading && user) {
    return (
      <AuthProvider>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <Breadcrumbs />
            <main className="flex-1 overflow-y-auto p-3 md:p-6">
              <div className="mx-auto max-w-5xl">{children}</div>
            </main>
          </div>
        </div>
      </AuthProvider>
    );
  }

  // Not authenticated (or loading): public layout
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <SharedNavbar />

      {/* Content */}
      <AuthProvider>
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">{children}</main>
      </AuthProvider>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{t.landing.footer}</span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <LocalizedLink href="/privacy" className="hover:text-foreground transition-colors">
              {t.landing.footerPrivacy}
            </LocalizedLink>
            <LocalizedLink href="/terms" className="hover:text-foreground transition-colors">
              {t.landing.footerTerms}
            </LocalizedLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
