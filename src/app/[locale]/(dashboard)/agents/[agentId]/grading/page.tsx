"use client";

import { use, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import {
  gradingSuitesCollection,
  gradingRunsCollection,
  gradingCasesCollection,
  type GradingSuiteDoc,
  type GradingRunDoc,
  type GradingCaseDoc,
} from "@/lib/firebase/firestore";
import { createGradingSuite, deleteGradingSuite } from "@/actions/grading-suites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Zap,
  Wrench,
} from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { LocalizedLink } from "@/components/LocalizedLink";
import { ScoreBadge } from "@/components/grading/ScoreBadge";
import { useDictionary } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import type { Timestamp } from "firebase/firestore";

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts || !ts.toDate) return "—";
  return ts.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GradingPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const { data: suites, loading } = useCollection<GradingSuiteDoc>(
    user ? gradingSuitesCollection(user.uid, agentId) : null,
    "createdAt"
  );
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate() {
    if (!user || !name.trim()) return;
    try {
      await createGradingSuite(user.uid, agentId, { name, description });
      toast.success("Grading suite created");
      setShowNew(false);
      setName("");
      setDescription("");
    } catch {
      toast.error("Failed to create suite");
    }
  }

  async function handleDelete(suiteId: string) {
    if (!user) return;
    try {
      await deleteGradingSuite(user.uid, agentId, suiteId);
      toast.success("Suite deleted");
    } catch {
      toast.error("Failed to delete suite");
    }
  }

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t.grading.title}</h1>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t.grading.addSuite}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.grading.addSuite}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Core Behaviors" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tests for core agent behaviors..." />
                </div>
                <Button onClick={handleCreate} disabled={!name.trim()}>
                  {t.grading.addSuite}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SlideUp>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : suites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          {t.grading.noSuitesDesc}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_80px] md:grid-cols-[1fr_64px_80px_56px_56px_100px_40px] items-center gap-x-3 px-4 py-2 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <span>Suite</span>
              <span className="hidden md:block text-right">Cases</span>
              <span className="text-right">Score</span>
              <span className="hidden md:block text-right">{t.grading.runs.passed}</span>
              <span className="hidden md:block text-right">{t.grading.runs.failed}</span>
              <span className="hidden md:block text-right">Last Run</span>
              <span />
            </div>
            <StaggerChildren>
              <div className="divide-y">
                {suites.map((suite) => (
                  <motion.div key={suite.id} variants={staggerItem}>
                    <SuiteRow
                      agentId={agentId}
                      suite={suite}
                      userId={user?.uid || ""}
                      onDelete={handleDelete}
                    />
                  </motion.div>
                ))}
              </div>
            </StaggerChildren>
          </CardContent>
        </Card>
      )}

      {/* Recent Runs across all suites */}
      {suites.length > 0 && user && (
        <RecentRunsSection agentId={agentId} userId={user.uid} suites={suites} t={t} />
      )}
    </div>
  );
}

function SuiteRow({
  agentId,
  suite,
  userId,
  onDelete,
}: {
  agentId: string;
  suite: GradingSuiteDoc & { id: string };
  userId: string;
  onDelete: (suiteId: string) => void;
}) {
  const { data: cases } = useCollection<GradingCaseDoc>(
    userId ? gradingCasesCollection(userId, agentId, suite.id) : null,
    "orderIndex",
    "asc"
  );
  const { data: runs } = useCollection<GradingRunDoc>(
    userId ? gradingRunsCollection(userId, agentId, suite.id) : null,
    "createdAt"
  );

  const latestRun = runs.length > 0 ? runs[0] : null;

  return (
    <LocalizedLink href={`/agents/${agentId}/grading/${suite.id}/runs`}>
      <div className="grid grid-cols-[1fr_80px] md:grid-cols-[1fr_64px_80px_56px_56px_100px_40px] items-center gap-x-3 px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer group">
        {/* Suite name + description */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {suite.name}
          </p>
          {suite.description && (
            <p className="text-xs text-muted-foreground truncate">{suite.description}</p>
          )}
        </div>

        {/* Cases count */}
        <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
          {cases.length}
        </span>

        {/* Score */}
        <div className="flex justify-end">
          {latestRun?.score !== null && latestRun?.score !== undefined ? (
            <ScoreBadge score={latestRun.score} size="sm" />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Passed */}
        <span className="hidden md:block text-xs text-right tabular-nums">
          {latestRun ? (
            <span className="text-emerald-600 dark:text-emerald-400">{latestRun.passedCases}</span>
          ) : "—"}
        </span>

        {/* Failed */}
        <span className="hidden md:block text-xs text-right tabular-nums">
          {latestRun ? (
            <span className={latestRun.totalCases - latestRun.passedCases > 0 ? "text-destructive" : "text-muted-foreground"}>
              {latestRun.totalCases - latestRun.passedCases}
            </span>
          ) : "—"}
        </span>

        {/* Last run date */}
        <span className="hidden md:block text-xs text-muted-foreground text-right">
          {latestRun ? formatDate(latestRun.completedAt || latestRun.createdAt) : "—"}
        </span>

        {/* Delete */}
        <div className="flex justify-end">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(suite.id);
            }}
            className="p-1 rounded hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      </div>
    </LocalizedLink>
  );
}

function RecentRunsSection({
  agentId,
  userId,
  suites,
  t,
}: {
  agentId: string;
  userId: string;
  suites: (GradingSuiteDoc & { id: string })[];
  t: ReturnType<typeof useDictionary>;
}) {
  const suitesToLoad = suites.slice(0, 5);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t.grading.runs.title}</h2>
      {suitesToLoad.map((suite) => (
        <SuiteRecentRuns key={suite.id} agentId={agentId} userId={userId} suite={suite} t={t} />
      ))}
    </div>
  );
}

function SuiteRecentRuns({
  agentId,
  userId,
  suite,
  t,
}: {
  agentId: string;
  userId: string;
  suite: GradingSuiteDoc & { id: string };
  t: ReturnType<typeof useDictionary>;
}) {
  const { data: runs } = useCollection<GradingRunDoc>(
    userId ? gradingRunsCollection(userId, agentId, suite.id) : null,
    "createdAt"
  );

  // Show last 5 runs
  const recentRuns = runs.slice(0, 5);

  if (recentRuns.length === 0) return null;

  const ns = t.grading.nextSteps;

  return (
    <Card>
      <CardContent className="p-0">
        {/* Suite header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <LocalizedLink href={`/agents/${agentId}/grading/${suite.id}/runs`}>
            <span className="text-sm font-medium hover:text-primary transition-colors">
              {suite.name}
            </span>
          </LocalizedLink>
          <div className="flex items-center gap-2">
            {/* CTA based on latest run */}
            {recentRuns[0]?.status === "completed" && (recentRuns[0].totalCases - recentRuns[0].passedCases) > 0 && (
              <LocalizedLink href={`/agents/${agentId}/optimize?suite=${suite.id}&mode=autofix`}>
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-primary">
                  <Wrench className="h-3 w-3" />
                  AutoFix
                </Button>
              </LocalizedLink>
            )}
            {recentRuns[0]?.status === "completed" && recentRuns[0].score !== null && recentRuns[0].score < 1 && (
              <LocalizedLink href={`/agents/${agentId}/optimize?suite=${suite.id}&mode=autotune`}>
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-primary">
                  <Zap className="h-3 w-3" />
                  AutoTune
                </Button>
              </LocalizedLink>
            )}
            <LocalizedLink href={`/agents/${agentId}/grading/${suite.id}/runs`}>
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1">
                All runs
                <ChevronRight className="h-3 w-3" />
              </Button>
            </LocalizedLink>
          </div>
        </div>

        {/* Runs rows */}
        <div className="divide-y">
          {recentRuns.map((run) => (
            <LocalizedLink key={run.id} href={`/agents/${agentId}/grading/${suite.id}/runs/${run.id}`}>
              <div className="grid grid-cols-[auto_1fr_60px] md:grid-cols-[auto_1fr_64px_56px_56px_100px] items-center gap-x-3 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer">
                {/* Status dot */}
                <div className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  run.status === "completed" && run.passedCases === run.totalCases ? "bg-emerald-500" :
                  run.status === "completed" ? "bg-amber-500" :
                  run.status === "failed" ? "bg-red-500" :
                  run.status === "running" ? "bg-blue-500 animate-pulse" :
                  "bg-muted-foreground"
                )} />

                {/* Version + status */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">v{run.agentVersion}</span>
                  <Badge
                    variant={
                      run.status === "completed" ? "secondary" :
                      run.status === "failed" ? "destructive" :
                      "default"
                    }
                    className="text-[10px] px-1.5 py-0"
                  >
                    {run.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {run.passedCases}/{run.totalCases}
                  </span>
                </div>

                {/* Score */}
                <div className="flex justify-end">
                  {run.score !== null ? (
                    <ScoreBadge score={run.score} size="sm" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                {/* Passed */}
                <span className="hidden md:flex items-center justify-end gap-1 text-xs tabular-nums">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  {run.passedCases}
                </span>

                {/* Failed */}
                <span className="hidden md:flex items-center justify-end gap-1 text-xs tabular-nums">
                  <XCircle className="h-3 w-3 text-destructive" />
                  {run.totalCases - run.passedCases}
                </span>

                {/* Date */}
                <span className="hidden md:block text-xs text-muted-foreground text-right">
                  {formatDate(run.completedAt || run.createdAt)}
                </span>
              </div>
            </LocalizedLink>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
