"use client";

import { use, useState } from "react";
import { usePathname } from "next/navigation";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { agentDoc, type AgentDoc } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import {
  Pencil,
  BookOpen,
  Wrench,
  Puzzle,
  MessageSquare,
  ClipboardCheck,
  Server,
  Workflow,
  Activity,
  FlaskConical,
  Plug,
  LayoutDashboard,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";

interface SidebarItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  accent: string;
}

function getSidebarItems(agentId: string, t: Record<string, any>): SidebarItem[] {
  const base = `/agents/${agentId}`;
  return [
    { id: "playground", path: `${base}/playground`, label: t.agents?.detail?.playground ?? "Playground", icon: MessageSquare, accent: "text-emerald-500" },
    { id: "operator", path: `${base}/operator`, label: t.agents?.detail?.operatorView ?? "Dashboard", icon: LayoutDashboard, accent: "text-green-500" },
    { id: "overview", path: base, label: t.agents?.detail?.overview ?? "Overview", icon: Activity, accent: "text-teal-500" },
    { id: "edit", path: `${base}/edit`, label: t.agents?.detail?.editConfig ?? "Config", icon: Pencil, accent: "text-slate-500" },
    { id: "skills", path: `${base}/skills`, label: t.agents?.detail?.skills ?? "Skills", icon: BookOpen, accent: "text-blue-500" },
    { id: "tools", path: `${base}/tools`, label: t.agents?.detail?.tools ?? "Tools", icon: Wrench, accent: "text-amber-500" },
    { id: "extensions", path: `${base}/extensions`, label: t.agents?.detail?.extensions ?? "Extensions", icon: Puzzle, accent: "text-purple-500" },
    { id: "grading", path: `${base}/grading`, label: t.agents?.detail?.grading ?? "Grading", icon: ClipboardCheck, accent: "text-cyan-500" },
    { id: "optimize", path: `${base}/optimize`, label: t.agents?.detail?.optimize ?? "Optimize", icon: FlaskConical, accent: "text-pink-500" },
    { id: "mcp-servers", path: `${base}/mcp-servers`, label: t.agents?.detail?.mcpServers ?? "MCP", icon: Server, accent: "text-indigo-500" },
    { id: "pipelines", path: `${base}/pipelines`, label: t.pipelines?.title ?? "Pipelines", icon: Workflow, accent: "text-orange-500" },
    { id: "connectors", path: `${base}/connectors`, label: t.connectors?.title ?? "Connectors", icon: Plug, accent: "text-rose-500" },
    { id: "sessions", path: `${base}/sessions`, label: t.sessions?.title ?? "Sessions", icon: Activity, accent: "text-teal-500" },
  ];
}

export default function AgentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: agent } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null
  );
  const t = useDictionary();
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const items = getSidebarItems(agentId, t);

  // Determine active item from current pathname
  function isActive(item: SidebarItem): boolean {
    const localizedPath = `/${locale}${item.path}`;
    if (item.id === "overview") {
      return pathname === localizedPath;
    }
    return pathname.startsWith(localizedPath);
  }

  return (
    <div className="space-y-3">
      {/* Compact header */}
      {agent && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <LocalizedLink href="/agents" className="text-muted-foreground hover:text-foreground text-sm shrink-0">
              ← {t.agents?.title ?? "Agents"}
            </LocalizedLink>
            <span className="text-muted-foreground/40 hidden sm:inline">/</span>
            <h1 className="text-base sm:text-lg font-bold truncate">{agent.name}</h1>
            <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">{agent.domain}</Badge>
            <span className="text-xs text-muted-foreground hidden md:inline">v{agent.version} · {agent.modelId}</span>
            {agent.latestGradingScore !== null && (
              <Badge variant="outline" className="text-[10px] tabular-nums hidden sm:inline-flex">
                <AnimatedCounter value={agent.latestGradingScore * 100} suffix="%" />
              </Badge>
            )}
          </div>
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      )}

      <div className="flex gap-4">
        {/* Sidebar — desktop */}
        <nav className="hidden md:flex w-48 shrink-0 flex-col gap-1 sticky top-4 self-start">
          {items.map((item) => {
            const active = isActive(item);
            return (
              <LocalizedLink
                key={item.id}
                href={item.path}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[15px] transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${active ? item.accent : ""}`} />
                <span className="truncate">{item.label}</span>
              </LocalizedLink>
            );
          })}
        </nav>

        {/* Sidebar — mobile overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <nav className="relative w-64 h-full bg-background border-r p-4 space-y-1 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Navigation</p>
              {items.map((item) => {
                const active = isActive(item);
                return (
                  <LocalizedLink
                    key={item.id}
                    href={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm w-full transition-colors ${
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${active ? item.accent : ""}`} />
                    {item.label}
                  </LocalizedLink>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main content — children rendered by Next.js */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
