"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Bot,
  BookOpen,
  AlertTriangle,
  Bug,
  Cable,
  CreditCard,
  LayoutDashboard,
  Lightbulb,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);

function useNavItems() {
  const t = useDictionary();
  const { user } = useAuth();
  const isAdmin = user ? ADMIN_UIDS.includes(user.uid) : false;

  const items = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/agents", label: t.nav.agents, icon: Bot },
    { href: "/teams", label: t.nav.teams, icon: Users },
    { href: "/billing", label: t.nav.billing, icon: CreditCard },
    { href: "/api-keys", label: t.nav.api, icon: Cable },
    { href: "/examples", label: t.nav.examples, icon: Lightbulb },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  if (isAdmin) {
    items.push({ href: "/bugs", label: t.nav.bugs, icon: Bug });
    items.push({ href: "/errors", label: "Error Logs", icon: AlertTriangle });
  }

  return {
    main: items,
    docs: { href: "/docs", label: t.nav.docs, icon: BookOpen },
  };
}

/** Desktop sidebar — hidden on mobile */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { main: navItems, docs } = useNavItems();

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="hidden md:flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground"
    >
      <div className="flex h-14 items-center justify-between px-3">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LocalizedLink href="/" className="hover:opacity-80 transition-opacity">
                <img src="/logo_small.png" alt="Kopern" className="h-6" />
              </LocalizedLink>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <LocalizedLink href="/" className="hover:opacity-80 transition-opacity">
            <img src="/logo_small.png" alt="Kopern" className="h-6" />
          </LocalizedLink>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname.includes(item.href);

          const link = (
            <LocalizedLink
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </LocalizedLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* Bottom nav */}
      <div className="border-t px-2 py-3">
        {(() => {
          const isActive = pathname.includes(docs.href);
          const link = (
            <LocalizedLink
              href={docs.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <docs.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {docs.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </LocalizedLink>
          );
          if (collapsed) {
            return (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{docs.label}</TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })()}
      </div>
    </motion.aside>
  );
}

/** Mobile sidebar — Sheet drawer, visible only on small screens */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { main: navItems, docs } = useNavItems();

  const allItems = [...navItems, docs];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-9 w-9"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              <img src="/logo_small.png" alt="Kopern" className="h-6" />
            </SheetTitle>
          </SheetHeader>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {allItems.map((item) => {
              const isActive = pathname.includes(item.href);
              return (
                <LocalizedLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                  {item.label}
                </LocalizedLink>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
