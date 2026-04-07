"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { type User as FirebaseUser } from "firebase/auth";
import { onAuthChanged, signOut } from "@/lib/firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { BugReportDialog } from "@/components/feedback/BugReportDialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Code2,
  CreditCard,
  DollarSign,
  Github,
  Key,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Server,
  Settings,
  Sparkles,
  User,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SharedNavbarProps {
  /** "public" = full nav links. "dashboard" = minimal (sidebar handles nav). */
  variant?: "public" | "dashboard";
  /** If true, "Documentation" in dropdown scrolls to #how-it-works instead of linking to /docs */
  isLanding?: boolean;
}

// ─── Shared button style (landing hover effect) ──────────────────────────────

const NAV_BTN =
  "gap-2 font-semibold text-muted-foreground hover:text-foreground hover:!bg-transparent dark:hover:!bg-transparent border border-transparent hover:border-primary/50";

// ─── Component ───────────────────────────────────────────────────────────────

export function SharedNavbar({ variant = "public", isLanding = false }: SharedNavbarProps) {
  const t = useDictionary();
  const pathname = usePathname();
  const router = useLocalizedRouter();

  // Auth state — dashboard variant uses useAuth() (AuthProvider guaranteed), public uses raw listener
  const authCtx = variant === "dashboard" ? useAuth() : null;
  const [pubUser, setPubUser] = useState<FirebaseUser | null>(null);
  const [pubLoading, setPubLoading] = useState(true);

  useEffect(() => {
    if (variant === "dashboard") return;
    const unsub = onAuthChanged((u) => {
      setPubUser(u);
      setPubLoading(false);
    });
    return unsub;
  }, [variant]);

  const user = variant === "dashboard" ? authCtx?.user ?? null : pubUser;
  const loading = variant === "dashboard" ? false : pubLoading;

  // Scroll shadow (public only)
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (variant === "dashboard") return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  // ─── Documentation dropdown handler ──────────────────────────────────────

  function handleDocsClick() {
    if (isLanding) {
      document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/#how-it-works");
    }
  }

  // ─── Docs dropdown (shared between desktop + mobile) ─────────────────────

  const docsItems = [
    {
      label: t.nav.docs,
      href: user ? "/docs" : null,
      icon: BookOpen,
      onClick: !user ? handleDocsClick : undefined,
    },
    { label: t.nav.apiReference, href: "/api-reference", icon: Code2 },
    { label: t.nav.mcpDocs, href: "/mcp", icon: Server },
  ];

  // ─── Desktop nav links (public variant only) ────────────────────────────

  function DesktopNav() {
    return (
      <div className="flex-1 hidden md:flex items-center justify-center gap-1">
        <LocalizedLink href="/grader">
          <Button variant="ghost" size="sm" className={`${NAV_BTN} !text-accent`}>
            <ClipboardCheck className="h-4 w-4" />
            {t.nav.grader}
          </Button>
        </LocalizedLink>

        <LocalizedLink href="/monitor">
          <Button variant="ghost" size="sm" className={`${NAV_BTN} !text-accent`}>
            <Activity className="h-4 w-4" />
            {t.nav.monitor}
          </Button>
        </LocalizedLink>

        <LocalizedLink href="/examples">
          <Button variant="ghost" size="sm" className={NAV_BTN}>
            <Sparkles className="h-4 w-4" />
            Templates
          </Button>
        </LocalizedLink>

        {/* Docs dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={`${NAV_BTN} !text-accent`}>
              <BookOpen className="h-4 w-4" />
              {t.nav.docs}
              <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {docsItems.map((item) =>
              item.href ? (
                <DropdownMenuItem key={item.label} asChild>
                  <LocalizedLink href={item.href} className="flex items-center gap-2 w-full">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </LocalizedLink>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={item.label}
                  onClick={item.onClick}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <LocalizedLink href="/blog">
          <Button variant="ghost" size="sm" className={NAV_BTN}>
            <Newspaper className="h-4 w-4" />
            Blog
          </Button>
        </LocalizedLink>

        <LocalizedLink href="/pricing">
          <Button variant="ghost" size="sm" className={NAV_BTN}>
            <DollarSign className="h-4 w-4" />
            {t.nav.pricing}
          </Button>
        </LocalizedLink>
      </div>
    );
  }

  // ─── Mobile drawer (public variant) ──────────────────────────────────────

  function MobileDrawer() {
    return (
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
            <LocalizedLink href="/grader">
              <Button variant="ghost" className="justify-start gap-3 h-11 w-full font-semibold text-accent">
                <ClipboardCheck className="h-4 w-4" /> {t.nav.grader}
              </Button>
            </LocalizedLink>
            <LocalizedLink href="/monitor">
              <Button variant="ghost" className="justify-start gap-3 h-11 w-full font-semibold text-accent">
                <Activity className="h-4 w-4" /> {t.nav.monitor}
              </Button>
            </LocalizedLink>
            <LocalizedLink href="/examples">
              <Button variant="ghost" className="justify-start gap-3 h-11 w-full font-semibold">
                <Sparkles className="h-4 w-4" /> Templates
              </Button>
            </LocalizedLink>

            {/* Docs section */}
            <p className="text-xs font-semibold text-muted-foreground px-3 pt-3 pb-1">{t.nav.docs}</p>
            {docsItems.map((item) =>
              item.href ? (
                <LocalizedLink key={item.label} href={item.href}>
                  <Button variant="ghost" className="justify-start gap-3 h-11 w-full font-semibold pl-6">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Button>
                </LocalizedLink>
              ) : (
                <Button
                  key={item.label}
                  variant="ghost"
                  className="justify-start gap-3 h-11 w-full font-semibold pl-6"
                  onClick={item.onClick}
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </Button>
              )
            )}

            <LocalizedLink href="/blog">
              <Button variant="ghost" className="justify-start gap-3 h-11 w-full font-semibold">
                <Newspaper className="h-4 w-4" /> Blog
              </Button>
            </LocalizedLink>
            <LocalizedLink href="/pricing">
              <Button variant="ghost" className="justify-start gap-3 h-11 w-full font-semibold">
                <DollarSign className="h-4 w-4" /> {t.nav.pricing}
              </Button>
            </LocalizedLink>

            <Separator className="my-2" />
            <a href="https://github.com/berch-t/kopern" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" className="justify-start gap-3 h-11 w-full font-semibold">
                <Github className="h-4 w-4" /> GitHub
              </Button>
            </a>
            {!loading && !user && (
              <LocalizedLink href="/login">
                <Button variant="outline" className="w-full mt-2">{t.common.signIn}</Button>
              </LocalizedLink>
            )}
            {!loading && user && (
              <LocalizedLink href="/dashboard">
                <Button variant="outline" className="w-full mt-2 gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  {t.landing.ctaDashboard}
                </Button>
              </LocalizedLink>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    );
  }

  // ─── User dropdown menu ──────────────────────────────────────────────────

  function UserMenu() {
    if (!user) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {user.photoURL ? (
            <button className="h-9 w-9 rounded-full overflow-hidden border hover:ring-2 hover:ring-primary/40 transition-all">
              <img
                src={user.photoURL}
                alt={user.displayName || "Profile"}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </button>
          ) : (
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <User className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem disabled className="flex flex-col items-start gap-0.5">
            <span className="text-xs font-medium truncate max-w-full">{user.displayName || user.email}</span>
            {user.displayName && (
              <span className="text-[10px] text-muted-foreground truncate max-w-full">{user.email}</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <LocalizedLink href="/dashboard" className="flex items-center gap-2 w-full">
              <LayoutDashboard className="h-4 w-4" />
              {t.nav.dashboard}
            </LocalizedLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <LocalizedLink href="/settings" className="flex items-center gap-2 w-full">
              <Settings className="h-4 w-4" />
              {t.nav.settings}
            </LocalizedLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <LocalizedLink href="/api-keys" className="flex items-center gap-2 w-full">
              <Key className="h-4 w-4" />
              {t.nav.api}
            </LocalizedLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <LocalizedLink href="/billing" className="flex items-center gap-2 w-full">
              <CreditCard className="h-4 w-4" />
              {t.nav.billing}
            </LocalizedLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            {t.common.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const isPublic = variant === "public";

  const wrapperClass = isPublic
    ? `sticky top-0 z-50 backdrop-blur-sm transition-all duration-300 ${scrolled ? "bg-background/50 border-b border-accent shadow-[0_2px_16px_oklch(0.7677_0.1606_310.19_/_0.5)]" : "bg-background"}`
    : "flex h-14 items-center border-b border-border/60";

  const innerClass = isPublic
    ? "flex items-center px-4 md:px-6 py-4 max-w-6xl mx-auto"
    : "flex flex-1 items-center justify-between px-4 md:px-6";

  return (
    <div className={wrapperClass}>
      <nav className={innerClass}>
        {/* Left: mobile hamburger (public) or MobileSidebar placeholder (dashboard) */}
        {isPublic ? (
          <MobileDrawer />
        ) : (
          <div>{/* MobileSidebar is rendered by Sidebar.tsx */}</div>
        )}

        {/* Logo (public only — dashboard has logo in sidebar) */}
        {isPublic && (
          <LocalizedLink href="/" className="hidden md:flex items-center shrink-0">
            <img src="/logo_small.png" alt="Kopern" className="h-7" />
          </LocalizedLink>
        )}

        {/* Center nav links (public only) */}
        {isPublic && <DesktopNav />}

        {/* Mobile spacer */}
        {isPublic && <div className="flex-1 md:hidden" />}

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={isPublic ? "hidden md:block" : ""}><BugReportDialog /></div>
          <a
            href="https://github.com/berch-t/kopern"
            target="_blank"
            rel="noopener noreferrer"
            className={isPublic ? "hidden md:block" : ""}
          >
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:!bg-transparent dark:hover:!bg-transparent border border-transparent hover:border-primary/50">
              <Github className="h-4 w-4" />
            </Button>
          </a>
          <LocaleSwitcher />
          {loading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted hidden md:block" />
          ) : user ? (
            <>
              {isPublic && (
                <LocalizedLink href="/dashboard" className="hidden md:block">
                  <Button variant="outline" className="gap-2 font-semibold">
                    <LayoutDashboard className="h-4 w-4" />
                    {t.landing.ctaDashboard}
                  </Button>
                </LocalizedLink>
              )}
              <UserMenu />
            </>
          ) : (
            isPublic && (
              <LocalizedLink href="/login" className="hidden md:block">
                <Button variant="outline" className="font-semibold">{t.common.signIn}</Button>
              </LocalizedLink>
            )
          )}
        </div>
      </nav>
    </div>
  );
}
