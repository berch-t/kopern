"use client";

import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { onAuthChanged } from "@/lib/firebase/auth";
import { useTheme } from "@/providers/ThemeProvider";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  DollarSign,
  LayoutDashboard,
  Moon,
  Sun,
} from "lucide-react";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const t = useDictionary();

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <LocalizedLink href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo_small.png" alt="Kopern" className="h-7" />
        </LocalizedLink>
        <div className="flex items-center gap-3">
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
          <LocaleSwitcher />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <LocalizedLink href="/dashboard">
              <Button variant="outline" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                {t.landing.ctaDashboard}
              </Button>
            </LocalizedLink>
          ) : (
            <LocalizedLink href="/login">
              <Button variant="outline">{t.common.signIn}</Button>
            </LocalizedLink>
          )}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {t.landing.footer}
      </footer>
    </div>
  );
}
