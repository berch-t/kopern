"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";
import { listSessions } from "@/actions/sessions";
import type { SessionDoc, SessionSource } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MessageSquare,
  Wrench,
  DollarSign,
  ArrowDownToLine,
  Activity,
  Download,
  Filter,
} from "lucide-react";
import { toCSV, downloadCSV, downloadJSON } from "@/lib/utils/csv-export";
import type { Timestamp } from "firebase/firestore";

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts || !ts.toDate) return "—";
  return ts.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: Timestamp | null | undefined, end: Timestamp | null | undefined): string {
  if (!start?.toDate) return "—";
  const startMs = start.toDate().getTime();
  const endMs = end?.toDate ? end.toDate().getTime() : Date.now();
  const diffMs = endMs - startMs;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const SOURCE_COLORS: Record<SessionSource, string> = {
  playground: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  widget: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  webhook: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  slack: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  mcp: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  grading: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  autoresearch: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  pipeline: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  team: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

const SOURCE_LABELS: Record<SessionSource, string> = {
  playground: "Playground",
  widget: "Widget",
  webhook: "Webhook",
  slack: "Slack",
  mcp: "MCP",
  grading: "Grading",
  autoresearch: "AutoResearch",
  pipeline: "Pipeline",
  team: "Team",
};

type SessionWithId = SessionDoc & { id: string };

function exportSessionsCSV(sessions: SessionWithId[], agentId: string) {
  const rows = sessions.map((s) => ({
    id: s.id,
    purpose: s.purpose || "",
    source: s.source || "playground",
    status: s.endedAt ? "ended" : "active",
    startedAt: s.startedAt?.toDate ? s.startedAt.toDate().toISOString() : "",
    endedAt: s.endedAt?.toDate ? s.endedAt.toDate().toISOString() : "",
    totalTokensIn: s.totalTokensIn,
    totalTokensOut: s.totalTokensOut,
    totalCost: s.totalCost,
    toolCallCount: s.toolCallCount,
    messageCount: s.messageCount,
    modelUsed: s.modelUsed || "",
    providerUsed: s.providerUsed || "",
  }));

  const columns = [
    { key: "id", label: "Session ID" },
    { key: "purpose", label: "Purpose" },
    { key: "source", label: "Source" },
    { key: "status", label: "Status" },
    { key: "startedAt", label: "Started At" },
    { key: "endedAt", label: "Ended At" },
    { key: "totalTokensIn", label: "Input Tokens" },
    { key: "totalTokensOut", label: "Output Tokens" },
    { key: "totalCost", label: "Cost (USD)" },
    { key: "toolCallCount", label: "Tool Calls" },
    { key: "messageCount", label: "Messages" },
    { key: "modelUsed", label: "Model" },
    { key: "providerUsed", label: "Provider" },
  ];

  const csv = toCSV(rows, columns);
  downloadCSV(csv, `sessions-${agentId}-${new Date().toISOString().slice(0, 10)}`);
}

function exportSessionsJSON(sessions: SessionWithId[], agentId: string) {
  const data = sessions.map((s) => ({
    id: s.id,
    purpose: s.purpose,
    source: s.source || "playground",
    status: s.endedAt ? "ended" : "active",
    startedAt: s.startedAt?.toDate ? s.startedAt.toDate().toISOString() : null,
    endedAt: s.endedAt?.toDate ? s.endedAt.toDate().toISOString() : null,
    totalTokensIn: s.totalTokensIn,
    totalTokensOut: s.totalTokensOut,
    totalCost: s.totalCost,
    toolCallCount: s.toolCallCount,
    messageCount: s.messageCount,
    modelUsed: s.modelUsed,
    providerUsed: s.providerUsed,
  }));
  downloadJSON(data, `sessions-${agentId}-${new Date().toISOString().slice(0, 10)}`);
}

export default function SessionsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();

  const [sessions, setSessions] = useState<SessionWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<SessionSource | "all">("all");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      const data = await listSessions(user!.uid, agentId);
      setSessions(data as SessionWithId[]);
      setLoading(false);
    }

    load();
  }, [user, agentId]);

  // Compute unique sources for filter chips
  const sourceCounts = new Map<SessionSource, number>();
  for (const s of sessions) {
    const src = s.source || "playground";
    sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
  }

  const filteredSessions = sourceFilter === "all"
    ? sessions
    : sessions.filter((s) => (s.source || "playground") === sourceFilter);

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8" />
            {t.sessions.title}
          </h1>

          {sessions.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSessionsCSV(filteredSessions, agentId)}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSessionsJSON(filteredSessions, agentId)}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                JSON
              </Button>
            </div>
          )}
        </div>
      </SlideUp>

      {/* Source filter chips */}
      {sourceCounts.size > 1 && (
        <SlideUp delay={0.05}>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setSourceFilter("all")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sourceFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All ({sessions.length})
            </button>
            {Array.from(sourceCounts.entries()).map(([src, count]) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sourceFilter === src
                    ? "bg-primary text-primary-foreground"
                    : `${SOURCE_COLORS[src]} hover:opacity-80`
                }`}
              >
                {SOURCE_LABELS[src]} ({count})
              </button>
            ))}
          </div>
        </SlideUp>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-lg font-medium">{t.sessions.noSessions}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.sessions.noSessionsDesc}</p>
          </div>
        </SlideUp>
      ) : filteredSessions.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <Filter className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No sessions matching this filter</p>
          </div>
        </SlideUp>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_100px] md:grid-cols-[auto_1fr_64px_72px_48px_48px_72px_72px_64px_100px] items-center gap-x-3 px-4 py-2 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <span className="w-2" />
              <span>Session</span>
              <span className="hidden md:block text-right">Status</span>
              <span className="hidden md:block text-right">Source</span>
              <span className="hidden md:block text-right">Msgs</span>
              <span className="hidden md:block text-right">Tools</span>
              <span className="hidden md:block text-right">Tokens</span>
              <span className="hidden md:block text-right">Cost</span>
              <span className="hidden md:block text-right">Duration</span>
              <span className="text-right">Date</span>
            </div>
            <StaggerChildren>
              <div className="divide-y">
                {filteredSessions.map((session) => {
                  const hasError = session.events?.some((e) => e.type === "error");
                  const isActive = !session.endedAt;
                  return (
                    <motion.div key={session.id} variants={staggerItem}>
                      <LocalizedLink href={`/agents/${agentId}/sessions/${session.id}`}>
                        <div className="grid grid-cols-[auto_1fr_100px] md:grid-cols-[auto_1fr_64px_72px_48px_48px_72px_72px_64px_100px] items-center gap-x-3 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer">
                          {/* Status indicator */}
                          <div className={`h-2 w-2 shrink-0 rounded-full ${isActive ? "bg-blue-500 animate-pulse" : hasError ? "bg-red-500" : "bg-emerald-500"}`} />

                          {/* Purpose */}
                          <p className="text-sm truncate min-w-0">
                            {session.purpose || "Untitled session"}
                          </p>

                          {/* Status badge */}
                          <div className="hidden md:block text-right">
                            <Badge variant={isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                              {isActive ? "Active" : "Ended"}
                            </Badge>
                          </div>

                          {/* Source */}
                          <div className="hidden md:block text-right">
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[session.source || "playground"]}`}>
                              {SOURCE_LABELS[session.source || "playground"]}
                            </span>
                          </div>

                          {/* Messages */}
                          <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
                            {session.messageCount}
                          </span>

                          {/* Tool calls */}
                          <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
                            {session.toolCallCount || "—"}
                          </span>

                          {/* Tokens */}
                          <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
                            {formatTokens(session.totalTokensIn + session.totalTokensOut)}
                          </span>

                          {/* Cost */}
                          <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
                            ${session.totalCost.toFixed(4)}
                          </span>

                          {/* Duration */}
                          <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
                            {formatDuration(session.startedAt, session.endedAt)}
                          </span>

                          {/* Date */}
                          <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
                            {formatDate(session.startedAt)}
                          </span>
                        </div>
                      </LocalizedLink>
                    </motion.div>
                  );
                })}
              </div>
            </StaggerChildren>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
