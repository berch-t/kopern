"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";
import { listSessions } from "@/actions/sessions";
import type { SessionDoc } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { motion } from "framer-motion";
import {
  Clock,
  MessageSquare,
  Wrench,
  DollarSign,
  ArrowDownToLine,
  Activity,
} from "lucide-react";
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

type SessionWithId = SessionDoc & { id: string };

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

  return (
    <div className="space-y-6">
      <SlideUp>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8" />
            {t.sessions.title}
          </h1>
        </div>
      </SlideUp>

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
      ) : (
        <StaggerChildren className="space-y-3">
          {sessions.map((session) => (
            <motion.div key={session.id} variants={staggerItem}>
              <LocalizedLink href={`/agents/${agentId}/sessions/${session.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4 space-y-3">
                    {/* Purpose + date */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {session.purpose || "Untitled session"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(session.startedAt)}
                        </p>
                      </div>
                      <Badge variant={session.endedAt ? "secondary" : "default"} className="shrink-0">
                        {session.endedAt ? "Ended" : "Active"}
                      </Badge>
                    </div>

                    {/* Metrics row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(session.startedAt, session.endedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowDownToLine className="h-3 w-3" />
                        {formatTokens(session.totalTokensIn + session.totalTokensOut)} {t.sessions.tokens}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${session.totalCost.toFixed(4)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {session.toolCallCount} {t.sessions.tools}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </LocalizedLink>
            </motion.div>
          ))}
        </StaggerChildren>
      )}
    </div>
  );
}
