"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { listBugs, updateBug, type BugWithId } from "@/actions/bugs";
import type { BugStatus } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Timestamp } from "firebase/firestore";
import {
  Bug,
  ExternalLink,
  Mail,
  MailCheck,
  GitBranch,
  GitPullRequest,
  AlertTriangle,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
  Send,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Zap,
  BarChart3,
  StickyNote,
} from "lucide-react";

const STATUS_VARIANTS: Record<BugStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "destructive",
  analyzing: "default",
  fixing: "default",
  awaiting_review: "secondary",
  fixed: "secondary",
  closed: "outline",
  wont_fix: "outline",
};

const STATUS_ICONS: Record<BugStatus, typeof Bug> = {
  new: AlertTriangle,
  analyzing: Search,
  fixing: Zap,
  awaiting_review: Eye,
  fixed: CheckCircle2,
  closed: CheckCircle2,
  wont_fix: XCircle,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-600 bg-red-500/10",
  high: "text-orange-600 bg-orange-500/10",
  medium: "text-yellow-600 bg-yellow-500/10",
  low: "text-slate-500 bg-slate-500/10",
};

function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts || !ts.toDate) return "\u2014";
  return ts.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(ts: Timestamp | null | undefined): string {
  if (!ts || !ts.toDate) return "\u2014";
  const diff = Date.now() - ts.toDate().getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ALL_STATUSES: BugStatus[] = [
  "new",
  "analyzing",
  "fixing",
  "awaiting_review",
  "fixed",
  "closed",
  "wont_fix",
];

const ADMIN_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  new: ["analyzing", "wont_fix", "closed"],
  analyzing: ["fixing", "wont_fix", "closed"],
  fixing: ["awaiting_review", "closed"],
  awaiting_review: ["fixed", "fixing", "closed"],
  fixed: ["closed"],
  closed: [],
  wont_fix: ["new"],
};

export default function BugsPage() {
  const { user } = useAuth();
  const t = useDictionary();

  const [bugs, setBugs] = useState<BugWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BugStatus | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    const data = await listBugs(user.uid, {
      status: statusFilter ?? undefined,
    });
    setBugs(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter]);

  async function handleStatusChange(bugId: string, newStatus: BugStatus) {
    if (!user) return;
    setUpdatingId(bugId);
    try {
      await updateBug(user.uid, bugId, { status: newStatus });
      toast.success(t.bugs.statusUpdated);
      await load();
    } catch {
      toast.error(t.bugs.errorUpdate);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAddNote(bugId: string) {
    if (!user || !newNote.trim()) return;
    const bug = bugs.find((b) => b.id === bugId);
    if (!bug) return;
    try {
      await updateBug(user.uid, bugId, {
        notes: [...(bug.notes || []), `[Admin] ${newNote.trim()}`],
      });
      setNewNote("");
      toast.success(t.bugs.noteAdded);
      await load();
    } catch {
      toast.error(t.bugs.errorUpdate);
    }
  }

  async function handleTriggerAgent(bugId: string) {
    if (!user) return;
    setTriggeringId(bugId);
    try {
      const bug = bugs.find((b) => b.id === bugId);
      if (!bug) return;
      const token = await user.getIdToken();
      const res = await fetch("/api/bug-report/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bugId }),
      });
      if (res.ok) {
        toast.success(t.bugs.agentTriggered);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t.bugs.errorTrigger);
      }
    } catch {
      toast.error(t.bugs.errorTrigger);
    } finally {
      setTriggeringId(null);
    }
  }

  // Stats
  const stats = {
    total: bugs.length,
    open: bugs.filter((b) => ["new", "analyzing", "fixing"].includes(b.status)).length,
    inProgress: bugs.filter((b) => ["analyzing", "fixing"].includes(b.status)).length,
    resolved: bugs.filter((b) => ["fixed", "closed"].includes(b.status)).length,
    awaitingReview: bugs.filter((b) => b.status === "awaiting_review").length,
    critical: bugs.filter((b) => b.severity === "critical" || b.severity === "high").length,
  };
  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bug className="h-8 w-8" />
              {t.bugs.title}
            </h1>
            <p className="text-muted-foreground mt-1">{t.bugs.subtitle}</p>
          </div>
        </div>
      </SlideUp>

      {/* KPI Stats */}
      {!loading && bugs.length > 0 && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          {[
            { label: t.bugs.statsTotal, value: stats.total, icon: BarChart3, color: "text-foreground" },
            { label: t.bugs.statsOpen, value: stats.open, icon: AlertTriangle, color: "text-red-500" },
            { label: t.bugs.statsInProgress, value: stats.inProgress, icon: Zap, color: "text-blue-500" },
            { label: t.bugs.statsAwaitingReview, value: stats.awaitingReview, icon: Eye, color: "text-amber-500" },
            { label: t.bugs.statsResolved, value: `${stats.resolved} (${resolutionRate}%)`, icon: CheckCircle2, color: "text-emerald-500" },
          ].map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button
          variant={statusFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(null)}
        >
          {t.bugs.filterAll}
        </Button>
        {ALL_STATUSES.map((s) => {
          const Icon = STATUS_ICONS[s];
          const count = bugs.filter((b) => b.status === s).length;
          return (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="gap-1.5"
            >
              <Icon className="h-3 w-3" />
              {t.bugs.statuses[s]}
              {statusFilter === null && count > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 min-w-[1.2rem] justify-center">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : bugs.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Bug className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-lg font-medium">{t.bugs.noBugs}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.bugs.noBugsDesc}</p>
          </div>
        </SlideUp>
      ) : (
        <StaggerChildren className="space-y-3">
          {bugs.map((bug) => {
            const isExpanded = expandedId === bug.id;
            const transitions = ADMIN_TRANSITIONS[bug.status];
            return (
              <motion.div key={bug.id} variants={staggerItem}>
                <Card className="transition-shadow hover:shadow-md">
                  {/* Header row — always visible */}
                  <CardHeader
                    className="flex flex-row items-center justify-between py-3 px-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : bug.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium line-clamp-1">{bug.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Clock className="inline h-3 w-3 mr-1" />
                          {formatRelative(bug.createdAt)}
                          {bug.reporterEmail && (
                            <span className="ml-3">
                              <Mail className="inline h-3 w-3 mr-1" />
                              {bug.reporterEmail}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={SEVERITY_COLORS[bug.severity]} variant="outline">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {bug.severity}
                      </Badge>
                      <Badge variant={STATUS_VARIANTS[bug.status]}>
                        {t.bugs.statuses[bug.status]}
                      </Badge>
                      {bug.thankYouSent && (
                        <MailCheck className="h-4 w-4 text-emerald-500" />
                      )}
                    </div>
                  </CardHeader>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <CardContent className="pt-0 pb-4 px-4 space-y-4">
                          {/* Full description */}
                          <div className="rounded-md bg-muted/50 p-3 text-sm">
                            <p>{bug.description}</p>
                            {bug.pageUrl && (
                              <p className="text-xs text-muted-foreground mt-2 truncate">
                                {t.bugs.page}: {bug.pageUrl}
                              </p>
                            )}
                          </div>

                          {/* Meta info */}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="font-mono">{t.bugs.bugId}: {bug.id.slice(0, 8)}</span>
                            <span>{t.bugs.created}: {formatDate(bug.createdAt)}</span>
                            <span>{t.bugs.updated}: {formatDate(bug.updatedAt)}</span>
                            {bug.assignedAt && (
                              <span>{t.bugs.assigned}: {formatDate(bug.assignedAt)}</span>
                            )}
                          </div>

                          {/* Git info */}
                          {(bug.fixBranch || bug.fixPrUrl) && (
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              {bug.fixBranch && (
                                <span className="flex items-center gap-1.5 font-mono text-xs bg-muted px-2 py-1 rounded">
                                  <GitBranch className="h-3 w-3" />
                                  {bug.fixBranch}
                                </span>
                              )}
                              {bug.fixPrUrl && (
                                <a
                                  href={bug.fixPrUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-blue-600 hover:underline"
                                >
                                  <GitPullRequest className="h-4 w-4" />
                                  {t.bugs.viewPr}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Analysis */}
                          {bug.analysis && (
                            <div className="rounded-md border p-3 text-sm space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                <Search className="h-3 w-3" />
                                {t.bugs.analysis}
                              </p>
                              <p className="whitespace-pre-wrap">{bug.analysis}</p>
                            </div>
                          )}

                          {/* Notes timeline */}
                          {bug.notes && bug.notes.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                <StickyNote className="h-3 w-3" />
                                {t.bugs.notes} ({bug.notes.length})
                              </p>
                              <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                                {bug.notes.map((note, i) => (
                                  <div key={i} className="text-sm py-1">
                                    <span className={note.startsWith("[Admin]") ? "text-primary font-medium" : ""}>
                                      {note}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Add note */}
                          <div className="flex gap-2">
                            <Input
                              value={expandedId === bug.id ? newNote : ""}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder={t.bugs.addNotePlaceholder}
                              className="text-sm h-9"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddNote(bug.id);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddNote(bug.id)}
                              disabled={!newNote.trim()}
                              className="shrink-0"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {t.bugs.addNote}
                            </Button>
                          </div>

                          {/* Admin actions */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                            {/* Status transitions */}
                            {transitions.length > 0 && (
                              <>
                                <span className="text-xs text-muted-foreground">{t.bugs.changeStatus}:</span>
                                {transitions.map((s) => (
                                  <Button
                                    key={s}
                                    size="sm"
                                    variant="outline"
                                    disabled={updatingId === bug.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(bug.id, s);
                                    }}
                                    className="text-xs h-7"
                                  >
                                    {updatingId === bug.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      t.bugs.statuses[s]
                                    )}
                                  </Button>
                                ))}
                              </>
                            )}

                            {/* Trigger agent */}
                            {["new", "analyzing"].includes(bug.status) && (
                              <Button
                                size="sm"
                                variant="default"
                                disabled={triggeringId === bug.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTriggerAgent(bug.id);
                                }}
                                className="text-xs h-7 ml-auto"
                              >
                                {triggeringId === bug.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Send className="h-3 w-3 mr-1" />
                                )}
                                {t.bugs.triggerAgent}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </StaggerChildren>
      )}
    </div>
  );
}
