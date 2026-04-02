"use client";

import { use, useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useDictionary } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useDocument, useCollection } from "@/hooks/useFirestore";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import {
  agentTeamDoc,
  agentsCollection,
  type AgentTeamDoc,
  type AgentDoc,
  type FlowNode,
  type FlowEdge,
} from "@/lib/firebase/firestore";
import { updateAgentTeam, deleteAgentTeam } from "@/actions/agent-teams";
import { teamToFlow } from "@/lib/flow/serialize";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { TeamMemberList } from "@/components/teams/TeamMemberList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import {
  Pencil,
  Trash2,
  Play,
  CheckCircle,
  Loader2,
  Clock,
  List,
  Workflow,
  Columns3,
  Download,
} from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { ActivityTimeline } from "@/components/teams/ActivityTimeline";
import { KanbanBoard } from "@/components/teams/KanbanBoard";
import { RoutineEditor } from "@/components/teams/RoutineEditor";
import { OrgChart } from "@/components/teams/OrgChart";
import { GoalTree } from "@/components/teams/GoalTree";
import { logTeamActivity } from "@/actions/team-activity";
import { createTeamRun, completeTeamRun, listTeamRuns } from "@/actions/team-runs";
import type { TeamRunDoc, TeamRunMemberResult } from "@/lib/firebase/firestore";

const FlowEditor = lazy(() => import("@/components/teams/FlowEditor"));

const modeColors: Record<string, string> = {
  parallel: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sequential: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  conditional: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const router = useLocalizedRouter();

  const { data: team, loading } = useDocument<AgentTeamDoc>(
    user ? agentTeamDoc(user.uid, teamId) : null
  );
  const { data: agents } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );

  const [editing, setEditing] = useState(false);
  const [viewMode, setViewMode] = useState<"flow" | "list" | "kanban">("flow");
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [executing, setExecuting] = useState(false);
  const [savingFlow, setSavingFlow] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<Record<string, "idle" | "running" | "completed" | "failed">>({});
  const [results, setResults] = useState<
    { agentId: string; status: "pending" | "running" | "completed" | "failed"; output: string }[]
  >([]);
  const [pastRuns, setPastRuns] = useState<(TeamRunDoc & { id: string })[]>([]);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Load past runs on mount
  useEffect(() => {
    if (!user) return;
    listTeamRuns(user.uid, teamId).then(setPastRuns).catch(() => {});
  }, [user, teamId]);

  // Sync edit fields when team loads
  useEffect(() => {
    if (team) {
      setEditName(team.name);
      setEditDescription(team.description);
    }
  }, [team]);

  // Build agent name + branding maps for flow serialization
  const agentNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.name;
    return map;
  }, [agents]);

  const agentBrandings = useMemo(() => {
    const map: Record<string, import("@/lib/firebase/firestore").AgentBranding | null> = {};
    for (const a of agents) map[a.id] = a.branding ?? null;
    return map;
  }, [agents]);

  // Generate flow data from team
  const flowData = useMemo(() => {
    if (!team) return { nodes: [], edges: [] };
    return teamToFlow(team, agentNames, agentBrandings);
  }, [team, agentNames, agentBrandings]);

  if (loading) {
    return (
      <div className="animate-pulse text-muted-foreground">{t.common.loading}</div>
    );
  }

  if (!team) {
    return <div className="text-destructive">{t.common.noResults}</div>;
  }

  function getAgent(agentId: string) {
    return agents.find((a) => a.id === agentId);
  }

  function getAgentName(agentId: string) {
    return getAgent(agentId)?.name ?? agentId;
  }

  async function handleDelete() {
    if (!user) return;
    await deleteAgentTeam(user.uid, teamId);
    router.push("/teams");
  }

  async function handleSaveFlow(nodes: FlowNode[], edges: FlowEdge[]) {
    if (!user) return;
    setSavingFlow(true);
    try {
      // Strip runtime-only fields and remove all undefined values (Firestore rejects them)
      const cleanNodes = nodes.map(({ id, type, position, data }) => {
        const { status, branding, ...rest } = data as Record<string, unknown>;
        return { id, type, position, data: JSON.parse(JSON.stringify(rest)) } as FlowNode;
      });
      const cleanEdges = edges.map((e) => JSON.parse(JSON.stringify(e)) as FlowEdge);
      await updateAgentTeam(user.uid, teamId, {
        flowNodes: cleanNodes,
        flowEdges: cleanEdges,
      });
      logTeamActivity(user.uid, teamId, "flow_updated", {
        message: `${nodes.length} nodes, ${edges.length} edges`,
      }).catch(() => {});
    } finally {
      setSavingFlow(false);
    }
  }

  async function handleRunTeam() {
    if (!team || !user || !prompt.trim()) return;
    setExecuting(true);
    setRunDialogOpen(false);

    const initialResults = team.agents.map((m) => ({
      agentId: m.agentId,
      status: "pending" as const,
      output: "",
    }));
    setResults(initialResults);

    // Reset node status for flow view
    const initialNodeStatus: Record<string, "idle" | "running" | "completed" | "failed"> = {};
    for (const m of team.agents) initialNodeStatus[`agent-${m.agentId}`] = "idle";
    setNodeStatus(initialNodeStatus);

    logTeamActivity(user.uid, teamId, "execution_started", {
      message: prompt.trim().slice(0, 100),
      agentCount: team.agents.length,
      mode: team.executionMode,
    }).catch(() => {});

    // Create persistent run record
    let runId = "";
    try {
      runId = await createTeamRun(user.uid, teamId, {
        prompt: prompt.trim(),
        executionMode: team.executionMode,
      });
    } catch { /* continue without persistence */ }

    try {
      const teamPayload = {
        name: team.name,
        executionMode: team.executionMode,
        agents: team.agents.map((m) => {
          const agentData = getAgent(m.agentId);
          return {
            agentId: m.agentId,
            agentName: agentData?.name || m.agentId,
            role: m.role,
            order: m.order,
            systemPrompt: agentData?.systemPrompt || "",
            modelProvider: agentData?.modelProvider || "anthropic",
            modelId: agentData?.modelId || "claude-sonnet-4-6",
          };
        }),
      };

      const res = await fetch(`/api/teams/${teamId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), userId: user.uid, team: teamPayload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Execution failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "member_start") {
                setResults((prev) =>
                  prev.map((r) =>
                    r.agentId === data.agentId ? { ...r, status: "running" } : r
                  )
                );
                setNodeStatus((prev) => ({
                  ...prev,
                  [`agent-${data.agentId}`]: "running",
                }));
              } else if (currentEvent === "member_token") {
                // Accumulate streamed tokens per agent
                setResults((prev) =>
                  prev.map((r) =>
                    r.agentId === data.agentId ? { ...r, output: r.output + (data.token ?? "") } : r
                  )
                );
              } else if (currentEvent === "member_done") {
                // Use final result if provided, otherwise keep accumulated tokens
                setResults((prev) =>
                  prev.map((r) =>
                    r.agentId === data.agentId ? { ...r, status: "completed", output: data.result || r.output } : r
                  )
                );
                setNodeStatus((prev) => ({
                  ...prev,
                  [`agent-${data.agentId}`]: "completed",
                }));
              } else if (currentEvent === "member_error") {
                setResults((prev) =>
                  prev.map((r) =>
                    r.agentId === data.agentId ? { ...r, status: "failed", output: data.error || "Error" } : r
                  )
                );
                setNodeStatus((prev) => ({
                  ...prev,
                  [`agent-${data.agentId}`]: "failed",
                }));
              } else if (currentEvent === "team_done") {
                // Mark output node as completed
                setNodeStatus((prev) => ({
                  ...prev,
                  "output-result": "completed",
                }));
              }
              currentEvent = undefined;
            } catch {
              // Skip malformed
            }
          }
        }
      }
      // Persist completed run
      if (runId && user) {
        const finalResults: TeamRunMemberResult[] = [];
        // Read current results from state via a ref-safe approach
        setResults((prev) => {
          for (const r of prev) {
            finalResults.push({
              agentId: r.agentId,
              agentName: getAgentName(r.agentId),
              role: team.agents.find((m) => m.agentId === r.agentId)?.role ?? "",
              status: r.status === "completed" ? "completed" : "failed",
              output: r.output,
              inputTokens: 0,
              outputTokens: 0,
              toolCallCount: 0,
              durationMs: 0,
            });
          }
          return prev;
        });
        completeTeamRun(user.uid, teamId, runId, {
          status: "completed",
          results: finalResults,
          totalCost: 0,
          totalTokensIn: 0,
          totalTokensOut: 0,
        }).catch(() => {});
        logTeamActivity(user.uid, teamId, "execution_completed", {
          message: `${finalResults.filter((r) => r.status === "completed").length}/${finalResults.length} agents completed`,
        }).catch(() => {});
        // Refresh past runs
        listTeamRuns(user.uid, teamId).then(setPastRuns).catch(() => {});
      }
    } catch (err) {
      console.error("Team execution error:", err);
      if (user) {
        if (runId) {
          completeTeamRun(user.uid, teamId, runId, {
            status: "failed",
            results: [],
            totalCost: 0,
            totalTokensIn: 0,
            totalTokensOut: 0,
          }).catch(() => {});
        }
        logTeamActivity(user.uid, teamId, "execution_failed", {
          message: String(err),
        }).catch(() => {});
      }
    } finally {
      setExecuting(false);
    }
  }

  const colorClass = modeColors[team.executionMode] || modeColors.sequential;

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            {editing ? (
              <div className="space-y-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-2xl font-bold h-auto py-1" />
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description..." className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={async () => {
                    if (!user) return;
                    await updateAgentTeam(user.uid, teamId, { name: editName.trim(), description: editDescription.trim() });
                    setEditing(false);
                  }}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditName(team.name); setEditDescription(team.description); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold">{team.name}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary" className={colorClass}>
                    {team.executionMode}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {team.agents.length} agent{team.agents.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {team.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{team.description}</p>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border p-0.5">
              <button
                onClick={() => setViewMode("flow")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "flow" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Workflow className="h-3.5 w-3.5" />
                Flow
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Kanban
              </button>
            </div>

            <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={executing || team.agents.length === 0}>
                  {executing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t.teams.executing}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      {t.teams.execute}
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t.teams.execute}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter a prompt for the team..."
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleRunTeam} disabled={!prompt.trim()}>
                      <Play className="mr-2 h-4 w-4" />
                      {t.teams.execute}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="icon" onClick={() => setEditing(!editing)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SlideUp>

      {/* Flow Editor View */}
      {viewMode === "flow" && (
        <FadeIn delay={0.1}>
          <Suspense fallback={<div className="h-[600px] animate-pulse rounded-xl border bg-muted" />}>
            <FlowEditor
              initialNodes={flowData.nodes}
              initialEdges={flowData.edges}
              agents={agents}
              onSave={handleSaveFlow}
              onExecute={() => setRunDialogOpen(true)}
              saving={savingFlow}
              nodeStatus={Object.keys(nodeStatus).length > 0 ? nodeStatus : undefined}
            />
          </Suspense>
        </FadeIn>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.teams.members}</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamMemberList
                members={team.agents}
                agents={agents}
                onUpdate={async (updated) => {
                  if (!user) return;
                  await updateAgentTeam(user.uid, teamId, { agents: updated });
                }}
                readonly={!editing}
              />
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <FadeIn delay={0.1}>
          <KanbanBoard teamId={teamId} agents={agents} />
        </FadeIn>
      )}

      {/* Execution Results — visible in all modes when results exist */}
      {results.some((r) => r.output) && (
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.teams.results}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const md = results
                      .filter((r) => r.output)
                      .map((r) => `## ${getAgentName(r.agentId)}\n\n${r.output}`)
                      .join("\n\n---\n\n");
                    const header = `# ${team.name} — Execution Report\n\n**Prompt:** ${prompt}\n**Date:** ${new Date().toISOString().slice(0, 16)}\n**Mode:** ${team.executionMode}\n**Agents:** ${results.length}\n\n---\n\n`;
                    const blob = new Blob([header + md], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${team.name.replace(/\s+/g, "-").toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Report
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.map((result) => {
                const member = team.agents.find((m) => m.agentId === result.agentId);
                return (
                  <div key={result.agentId} className="rounded-lg border overflow-hidden">
                    {/* Agent header */}
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b">
                      <AgentAvatar branding={getAgent(result.agentId)?.branding} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{getAgentName(result.agentId)}</p>
                        {member && <p className="text-[11px] text-muted-foreground">{member.role}</p>}
                      </div>
                      {result.status === "pending" && (
                        <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />pending</Badge>
                      )}
                      {result.status === "running" && (
                        <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />{t.teams.memberRunning}</Badge>
                      )}
                      {result.status === "completed" && (
                        <Badge variant="default" className="gap-1 bg-emerald-600"><CheckCircle className="h-3 w-3" />{t.teams.memberCompleted}</Badge>
                      )}
                      {result.status === "failed" && (
                        <Badge variant="destructive" className="gap-1">failed</Badge>
                      )}
                    </div>
                    {/* Output content */}
                    {result.output && (
                      <div className="px-4 py-3 text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto font-mono text-xs leading-relaxed">
                        {result.output}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </FadeIn>
      )}
      {/* Past Runs History */}
      {pastRuns.length > 0 && (
        <FadeIn delay={0.3}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Execution History</CardTitle>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                    const data = pastRuns.map((r) => ({
                      id: r.id, prompt: r.prompt, status: r.status, mode: r.executionMode,
                      agents: r.results?.length ?? 0, startedAt: r.startedAt?.toDate?.()?.toISOString() ?? "",
                    }));
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url;
                    a.download = `team-runs-${teamId}-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click(); URL.revokeObjectURL(url);
                  }}>
                    <Download className="h-3.5 w-3.5" /> JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <div className="grid grid-cols-[auto_1fr_100px] md:grid-cols-[auto_1fr_72px_48px_72px_100px] items-center gap-x-3 px-4 py-2 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <span className="w-2" />
                <span>Prompt</span>
                <span className="hidden md:block text-right">Status</span>
                <span className="hidden md:block text-right">Agents</span>
                <span className="hidden md:block text-right">Mode</span>
                <span className="text-right">Date</span>
              </div>
              <div className="divide-y">
                {pastRuns.map((run) => {
                  const isExpanded = results.length > 0 && false; // TODO: expand on click
                  return (
                    <div key={run.id} className="grid grid-cols-[auto_1fr_100px] md:grid-cols-[auto_1fr_72px_48px_72px_100px] items-center gap-x-3 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Load this run's results into the results panel
                        if (run.results?.length) {
                          setResults(run.results.map((r) => ({
                            agentId: r.agentId,
                            status: r.status === "completed" ? "completed" as const : "failed" as const,
                            output: r.output,
                          })));
                        }
                      }}
                    >
                      <div className={`h-2 w-2 shrink-0 rounded-full ${run.status === "completed" ? "bg-emerald-500" : run.status === "failed" ? "bg-red-500" : "bg-blue-500 animate-pulse"}`} />
                      <p className="text-sm truncate min-w-0">{run.prompt}</p>
                      <div className="hidden md:block text-right">
                        <Badge variant={run.status === "completed" ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
                          {run.status}
                        </Badge>
                      </div>
                      <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">{run.results?.length ?? 0}</span>
                      <span className="hidden md:block text-xs text-muted-foreground text-right">{run.executionMode}</span>
                      <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
                        {run.startedAt?.toDate?.()?.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) ?? "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Org Chart */}
      {team.agents.some((m) => m.reportsTo) && (
        <OrgChart members={team.agents} agents={agents} />
      )}

      {/* Goals */}
      <GoalTree teamId={teamId} />

      {/* Routines */}
      <RoutineEditor teamId={teamId} agents={agents} />

      {/* Activity Timeline */}
      <ActivityTimeline teamId={teamId} />
    </div>
  );
}
