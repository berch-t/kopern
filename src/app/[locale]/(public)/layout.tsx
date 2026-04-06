"use client";

import { useEffect, useState, useCallback } from "react";
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
  Code2,
  Server,
  LayoutDashboard,
  Github,
  Menu,
  BookOpen,
} from "lucide-react";
import { BugReportDialog } from "@/components/feedback/BugReportDialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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
      <div className={`sticky top-0 z-50 backdrop-blur-sm transition-all duration-300 ${scrolled ? "bg-background/50 border-b border-accent shadow-[0_2px_16px_oklch(0.7677_0.1606_310.19_/_0.5)]" : "bg-background"}`}>
      <nav className="flex items-center px-4 md:px-6 py-4 max-w-6xl mx-auto">
        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden h-11 w-11 shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex items-center gap-2 p-4 border-b">
              <img src="/logo_small.png" alt="Kopern" className="h-7" />
              <span className="font-semibold">Kopern</span>
            </div>
            <nav className="flex flex-col gap-1 p-4 overflow-y-auto">
              <LocalizedLink href="/examples">
                <Button variant="ghost" className="justify-start gap-3 h-11 w-full"><Lightbulb className="h-4 w-4" />{t.nav.examples}</Button>
              </LocalizedLink>
              <LocalizedLink href="/api-reference">
                <Button variant="ghost" className="justify-start gap-3 h-11 w-full"><Code2 className="h-4 w-4" />{t.nav.apiReference}</Button>
              </LocalizedLink>
              <LocalizedLink href="/mcp">
                <Button variant="ghost" className="justify-start gap-3 h-11 w-full"><Server className="h-4 w-4" />{t.nav.mcpDocs}</Button>
              </LocalizedLink>
              <LocalizedLink href="/pricing">
                <Button variant="ghost" className="justify-start gap-3 h-11 w-full"><DollarSign className="h-4 w-4" />{t.nav.pricing}</Button>
              </LocalizedLink>
              <LocalizedLink href="/blog">
                <Button variant="ghost" className="justify-start gap-3 h-11 w-full"><BookOpen className="h-4 w-4" />Blog</Button>
              </LocalizedLink>
              <Separator className="my-2" />
              <a href="https://github.com/berch-t/kopern" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="justify-start gap-3 h-11 w-full"><Github className="h-4 w-4" />GitHub</Button>
              </a>
              <LocalizedLink href="/login"><Button variant="outline" className="w-full mt-2">{t.common.signIn}</Button></LocalizedLink>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <LocalizedLink href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
          <img src="/logo_small.png" alt="Kopern" className="h-7" />
        </LocalizedLink>

        {/* Center nav — desktop only */}
        <div className="flex-1 hidden md:flex items-center justify-center gap-1">
          <LocalizedLink href="/examples">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Lightbulb className="h-4 w-4" />
              {t.nav.examples}
            </Button>
          </LocalizedLink>
          <LocalizedLink href="/api-reference">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Code2 className="h-4 w-4" />
              {t.nav.apiReference}
            </Button>
          </LocalizedLink>
          <LocalizedLink href="/mcp">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Server className="h-4 w-4" />
              {t.nav.mcpDocs}
            </Button>
          </LocalizedLink>
          <LocalizedLink href="/pricing">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <DollarSign className="h-4 w-4" />
              {t.nav.pricing}
            </Button>
          </LocalizedLink>
          <LocalizedLink href="/blog">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <BookOpen className="h-4 w-4" />
              Blog
            </Button>
          </LocalizedLink>
        </div>
        <div className="flex-1 md:hidden" />

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:block"><BugReportDialog /></div>
          <a href="https://github.com/berch-t/kopern" target="_blank" rel="noopener noreferrer" className="hidden md:block">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Github className="h-4 w-4" />
            </Button>
          </a>
          <LocaleSwitcher />
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted hidden md:block" />
          ) : (
            <LocalizedLink href="/login" className="hidden md:block">
              <Button variant="outline">{t.common.signIn}</Button>
            </LocalizedLink>
          )}
        </div>
      </nav>
      </div>

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
