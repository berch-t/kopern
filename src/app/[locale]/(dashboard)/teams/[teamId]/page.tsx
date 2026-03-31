"use client";

import { use, useState, useMemo, lazy, Suspense } from "react";
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

  // Build agent name map for flow serialization
  const agentNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.name;
    return map;
  }, [agents]);

  // Generate flow data from team
  const flowData = useMemo(() => {
    if (!team) return { nodes: [], edges: [] };
    return teamToFlow(team, agentNames);
  }, [team, agentNames]);

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
      await updateAgentTeam(user.uid, teamId, {
        flowNodes: nodes,
        flowEdges: edges,
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
    } catch (err) {
      console.error("Team execution error:", err);
      if (user) {
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
