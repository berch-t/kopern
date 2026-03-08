"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { getSession } from "@/actions/sessions";
import type { SessionDoc } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { SessionTimeline } from "@/components/observability/SessionTimeline";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  Wrench,
  MessageSquare,
  GitBranch,
  Clock,
  ClipboardCopy,
  Check,
} from "lucide-react";
import type { Timestamp } from "firebase/firestore";

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts || !ts.toDate) return "---";
  return ts.toDate().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: Timestamp | null | undefined, end: Timestamp | null | undefined): string {
  if (!start?.toDate) return "---";
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

type SessionWithId = SessionDoc & { id: string };

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; sessionId: string }>;
}) {
  const { agentId, sessionId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();

  const [session, setSession] = useState<SessionWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function load() {
      const data = await getSession(user!.uid, agentId, sessionId);
      setSession(data as SessionWithId | null);
      setLoading(false);
    }

    load();
  }, [user, agentId, sessionId]);

  function handleExportTrace() {
    if (!session) return;
    const traceData = {
      sessionId: session.id,
      purpose: session.purpose,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      totalTokensIn: session.totalTokensIn,
      totalTokensOut: session.totalTokensOut,
      totalCost: session.totalCost,
      toolCallCount: session.toolCallCount,
      subAgentCallCount: session.subAgentCallCount,
      messageCount: session.messageCount,
      modelUsed: session.modelUsed,
      providerUsed: session.providerUsed,
      events: session.events,
    };
    navigator.clipboard.writeText(JSON.stringify(traceData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-lg font-medium">Session not found</p>
      </div>
    );
  }

  const statCards = [
    {
      icon: ArrowDownToLine,
      label: t.sessions.tokens + " In",
      value: session.totalTokensIn,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: ArrowUpFromLine,
      label: t.sessions.tokens + " Out",
      value: session.totalTokensOut,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      icon: DollarSign,
      label: t.sessions.cost,
      value: session.totalCost,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
      decimals: 4,
      prefix: "$",
    },
    {
      icon: Wrench,
      label: t.sessions.tools,
      value: session.toolCallCount,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: MessageSquare,
      label: t.sessions.messages,
      value: session.messageCount,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: GitBranch,
      label: "Sub-agents",
      value: session.subAgentCallCount,
      iconColor: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <SlideUp>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {session.purpose ?? "Session"}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(session.startedAt)}
              </span>
              <Separator orientation="vertical" className="h-4" />
              <span>
                {t.sessions.duration}: {formatDuration(session.startedAt, session.endedAt)}
              </span>
              <Separator orientation="vertical" className="h-4" />
              <span className="font-mono text-xs">
                {session.modelUsed}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportTrace}>
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <ClipboardCopy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied!" : t.sessions.exportTrace}
          </Button>
        </div>
      </SlideUp>

      {/* Stat cards */}
      <FadeIn delay={0.1}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {stat.prefix ?? ""}
                    <AnimatedCounter value={stat.value} decimals={stat.decimals ?? 0} />
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </FadeIn>

      {/* Event Timeline */}
      <FadeIn delay={0.2}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.sessions.timeline}</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionTimeline events={session.events} />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
