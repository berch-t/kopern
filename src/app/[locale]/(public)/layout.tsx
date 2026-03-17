"use client";

import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { onAuthChanged } from "@/lib/firebase/auth";
import { AuthProvider } from "@/providers/AuthProvider";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  DollarSign,
  LayoutDashboard,
  Github,
} from "lucide-react";
import { BugReportDialog } from "@/components/feedback/BugReportDialog";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useDictionary();

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Authenticated: wrap in dashboard chrome (sidebar + header)
  if (!loading && user) {
    return (
      <AuthProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <Breadcrumbs />
            <main className="flex-1 overflow-y-auto p-6">
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
      <nav className="flex items-center px-6 py-4 max-w-6xl mx-auto">
        {/* Logo — left */}
        <LocalizedLink href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
          <img src="/logo_small.png" alt="Kopern" className="h-7" />
        </LocalizedLink>

        {/* Center nav buttons */}
        <div className="flex-1 flex items-center justify-center gap-1">
          <LocalizedLink href="/examples">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Lightbulb className="h-4 w-4" />
              {t.nav.examples}
            </Button>
          </LocalizedLink>
          <LocalizedLink href="/pricing">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <DollarSign className="h-4 w-4" />
              {t.nav.pricing}
            </Button>
          </LocalizedLink>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <BugReportDialog />
          <a
            href="https://github.com/berch-t/kopern"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Github className="h-4 w-4" />
            </Button>
          </a>
          <LocaleSwitcher />
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : (
            <LocalizedLink href="/login">
              <Button variant="outline">{t.common.signIn}</Button>
            </LocalizedLink>
          )}
        </div>
      </nav>

      {/* Content */}
      <AuthProvider>
        <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
      </AuthProvider>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {t.landing.footer}
      </footer>
    </div>
  );
}
