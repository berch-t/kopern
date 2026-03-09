"use client";

import { use, useState } from "react";
import { useDictionary } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useDocument, useCollection } from "@/hooks/useFirestore";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import {
  agentTeamDoc,
  agentsCollection,
  type AgentTeamDoc,
  type AgentDoc,
} from "@/lib/firebase/firestore";
import { updateAgentTeam, deleteAgentTeam } from "@/actions/agent-teams";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { TeamMemberList } from "@/components/teams/TeamMemberList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentAvatar";

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
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<
    { agentId: string; status: "pending" | "running" | "completed" }[]
  >([]);

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

  function handleRunTeam() {
    if (!team) return;
    setExecuting(true);
    setRunDialogOpen(false);

    // Initialize results for each member
    const initialResults = team.agents.map((m) => ({
      agentId: m.agentId,
      status: "pending" as const,
    }));
    setResults(initialResults);

    // Placeholder simulation: mark each as running then completed
    team.agents.forEach((member, index) => {
      const startDelay = team.executionMode === "parallel" ? 500 : index * 2000 + 500;
      const endDelay = startDelay + 1500;

      setTimeout(() => {
        setResults((prev) =>
          prev.map((r, i) => (i === index ? { ...r, status: "running" } : r))
        );
      }, startDelay);

      setTimeout(() => {
        setResults((prev) =>
          prev.map((r, i) => (i === index ? { ...r, status: "completed" } : r))
        );
        if (index === team.agents.length - 1) {
          setExecuting(false);
        }
      }, endDelay);
    });
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

      {results.length > 0 && (
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.teams.results}</CardTitle>
            </CardHeader>
            <CardContent>
              <StaggerChildren className="space-y-3">
                {results.map((result, index) => {
                  const member = team.agents[index];
                  return (
                    <motion.div
                      key={result.agentId}
                      variants={staggerItem}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <AgentAvatar branding={getAgent(result.agentId)?.branding} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {getAgentName(result.agentId)}
                        </p>
                        {member && (
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        )}
                      </div>
                      {result.status === "pending" && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          pending
                        </Badge>
                      )}
                      {result.status === "running" && (
                        <Badge variant="secondary" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          {t.teams.memberRunning}
                        </Badge>
                      )}
                      {result.status === "completed" && (
                        <Badge variant="default" className="gap-1 bg-emerald-600">
                          <CheckCircle className="h-3 w-3" />
                          {t.teams.memberCompleted}
                        </Badge>
                      )}
                    </motion.div>
                  );
                })}
              </StaggerChildren>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
