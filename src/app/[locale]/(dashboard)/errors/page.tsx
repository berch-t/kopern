"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlideUp } from "@/components/motion/SlideUp";
import {
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Bot,
  Filter,
  Download,
} from "lucide-react";
import { toCSV, downloadCSV, downloadJSON } from "@/lib/utils/csv-export";

const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);

interface ErrorLog {
  id: string;
  code: string;
  message: string;
  source: string;
  severity: string;
  userId: string | null;
  agentId: string | null;
  metadata: Record<string, unknown>;
  userNotified: boolean;
  createdAt: Timestamp | null;
}

const SEVERITY_CONFIG = {
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", badge: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" },
  error: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10", badge: "bg-red-500/20 text-red-500 border-red-500/30" },
  critical: { icon: AlertOctagon, color: "text-red-700", bg: "bg-red-700/10", badge: "bg-red-700/20 text-red-300 border-red-700/30" },
};

const SOURCE_COLORS: Record<string, string> = {
  slack_events: "bg-purple-500/20 text-purple-400",
  webhook_inbound: "bg-blue-500/20 text-blue-400",
  webhook_outbound: "bg-cyan-500/20 text-cyan-400",
  widget_chat: "bg-green-500/20 text-green-400",
  chat: "bg-indigo-500/20 text-indigo-400",
  grading: "bg-amber-500/20 text-amber-400",
  mcp: "bg-teal-500/20 text-teal-400",
  billing: "bg-orange-500/20 text-orange-400",
  session: "bg-gray-500/20 text-gray-400",
  plan_guard: "bg-rose-500/20 text-rose-400",
  system: "bg-red-500/20 text-red-400",
};

export default function ErrorLogsPage() {
  const { user } = useAuth();
  const isAdmin = user ? ADMIN_UIDS.includes(user.uid) : false;

  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pageSize] = useState(100);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const col = collection(db, "errorLogs");
      let q = query(col, orderBy("createdAt", "desc"), limit(pageSize));

      if (severityFilter) {
        q = query(col, where("severity", "==", severityFilter), orderBy("createdAt", "desc"), limit(pageSize));
      } else if (sourceFilter) {
        q = query(col, where("source", "==", sourceFilter), orderBy("createdAt", "desc"), limit(pageSize));
      }

      const snap = await getDocs(q);
      const logs = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ErrorLog[];
      setErrors(logs);
    } catch (err) {
      console.error("Failed to fetch error logs:", err);
    } finally {
      setLoading(false);
    }
  }, [severityFilter, sourceFilter, pageSize]);

  useEffect(() => {
    if (isAdmin) fetchErrors();
  }, [isAdmin, fetchErrors]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  // Apply client-side search filter
  const filtered = errors.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.code.toLowerCase().includes(q) ||
      e.message.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q) ||
      (e.userId && e.userId.toLowerCase().includes(q)) ||
      (e.agentId && e.agentId.toLowerCase().includes(q))
    );
  });

  // Stats
  const criticalCount = errors.filter((e) => e.severity === "critical").length;
  const errorCount = errors.filter((e) => e.severity === "error").length;
  const warningCount = errors.filter((e) => e.severity === "warning").length;
  const unnotifiedCount = errors.filter((e) => !e.userNotified).length;

  // Unique sources for filter
  const sources = [...new Set(errors.map((e) => e.source))].sort();

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Error Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {errors.length} errors logged
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const rows = filtered.map((e) => ({
                      id: e.id,
                      code: e.code,
                      message: e.message,
                      source: e.source,
                      severity: e.severity,
                      userId: e.userId || "",
                      agentId: e.agentId || "",
                      userNotified: e.userNotified ? "yes" : "no",
                      createdAt: e.createdAt?.toDate ? e.createdAt.toDate().toISOString() : "",
                    }));
                    downloadCSV(toCSV(rows), `error-logs-${new Date().toISOString().slice(0, 10)}`);
                  }}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const data = filtered.map((e) => ({
                      id: e.id,
                      code: e.code,
                      message: e.message,
                      source: e.source,
                      severity: e.severity,
                      userId: e.userId,
                      agentId: e.agentId,
                      userNotified: e.userNotified,
                      metadata: e.metadata,
                      createdAt: e.createdAt?.toDate ? e.createdAt.toDate().toISOString() : null,
                    }));
                    downloadJSON(data, `error-logs-${new Date().toISOString().slice(0, 10)}`);
                  }}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={fetchErrors} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className={`cursor-pointer transition-colors ${severityFilter === "critical" ? "border-red-500" : ""}`}
            onClick={() => setSeverityFilter(severityFilter === "critical" ? null : "critical")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-700/10">
                <AlertOctagon className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${severityFilter === "error" ? "border-red-500" : ""}`}
            onClick={() => setSeverityFilter(severityFilter === "error" ? null : "error")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{errorCount}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${severityFilter === "warning" ? "border-yellow-500" : ""}`}
            onClick={() => setSeverityFilter(severityFilter === "warning" ? null : "warning")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warningCount}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <User className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unnotifiedCount}</p>
                <p className="text-xs text-muted-foreground">User not notified</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, message, source, userId..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {sources.map((src) => (
              <Badge
                key={src}
                variant="outline"
                className={`cursor-pointer transition-colors ${sourceFilter === src ? "border-primary bg-primary/10" : ""} ${SOURCE_COLORS[src] || ""}`}
                onClick={() => setSourceFilter(sourceFilter === src ? null : src)}
              >
                {src}
              </Badge>
            ))}
          </div>
        </div>

        {/* Error List */}
        <div className="space-y-2">
          {loading && errors.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Loading error logs...
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {searchQuery || severityFilter || sourceFilter
                  ? "No errors match your filters."
                  : "No errors logged yet. That's a good sign!"}
              </CardContent>
            </Card>
          ) : (
            filtered.map((error) => {
              const config = SEVERITY_CONFIG[error.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.error;
              const SeverityIcon = config.icon;
              const isExpanded = expandedId === error.id;
              const timestamp = error.createdAt
                ? (error.createdAt as Timestamp).toDate?.()
                  ? (error.createdAt as Timestamp).toDate().toLocaleString()
                  : new Date(error.createdAt as unknown as string).toLocaleString()
                : "Unknown";

              return (
                <Card
                  key={error.id}
                  className={`cursor-pointer transition-colors hover:border-muted-foreground/30 ${isExpanded ? "border-muted-foreground/50" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : error.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-md ${config.bg} mt-0.5`}>
                        <SeverityIcon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-sm font-semibold">{error.code}</code>
                          <Badge variant="outline" className={`text-xs ${config.badge}`}>
                            {error.severity}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${SOURCE_COLORS[error.source] || ""}`}>
                            {error.source}
                          </Badge>
                          {!error.userNotified && (
                            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
                              silent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{error.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timestamp}
                          </span>
                          {error.userId && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {error.userId.slice(0, 12)}...
                            </span>
                          )}
                          {error.agentId && (
                            <span className="flex items-center gap-1">
                              <Bot className="h-3 w-3" />
                              {error.agentId.slice(0, 12)}...
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Full message</p>
                          <p className="text-sm">{error.message}</p>
                        </div>
                        {error.userId && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">User ID</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{error.userId}</code>
                          </div>
                        )}
                        {error.agentId && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Agent ID</p>
                            <code className="text-xs bg-muted px-2 py-1 rounded">{error.agentId}</code>
                          </div>
                        )}
                        {error.metadata && Object.keys(error.metadata).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Metadata</p>
                            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-48">
                              {JSON.stringify(error.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>ID: {error.id}</span>
                          <span>|</span>
                          <span>User notified: {error.userNotified ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </SlideUp>
  );
}
