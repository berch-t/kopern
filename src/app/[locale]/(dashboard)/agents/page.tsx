"use client";

import { useState, useEffect } from "react";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { useCollection } from "@/hooks/useFirestore";
import { agentsCollection, agentTeamsCollection, type AgentDoc, type AgentTeamDoc } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Users, Bot, LayoutDashboard, ExternalLink } from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { MetaAgentWizard } from "@/components/agents/MetaAgentWizard";
import { WelcomeWizard } from "@/components/onboarding/WelcomeWizard";

const DOMAIN_COLORS: Record<string, string> = {
  devops: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  support: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  legal: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  sales: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  marketing: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  finance: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  hr: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

const MODE_COLORS: Record<string, string> = {
  parallel: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  sequential: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  conditional: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
};

export default function AgentsPage() {
  const { user } = useAuth();
  const t = useDictionary();
  const locale = useLocale();
  const isFr = locale === "fr";
  const router = useLocalizedRouter();
  const { data: agents, loading } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );
  const { data: teams } = useCollection<AgentTeamDoc>(
    user ? agentTeamsCollection(user.uid) : null,
    "updatedAt"
  );

  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (!loading && agents.length === 0 && user) {
      setWizardOpen(true);
    }
  }, [loading, agents.length, user]);

  return (
    <div className="space-y-8">
      <SlideUp>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t.agents.title}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWizardOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              {isFr ? "Assistant rapide" : "Quick assistant"}
            </Button>
            {user && <MetaAgentWizard userId={user.uid} />}
            <LocalizedLink href="/agents/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t.agents.newAgent}
              </Button>
            </LocalizedLink>
          </div>
        </div>
      </SlideUp>

      {/* Agents Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Bot className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-lg font-medium">{t.agents.noAgents}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.agents.noAgentsDesc}</p>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => setWizardOpen(true)}>{t.agents.createAgent}</Button>
              <LocalizedLink href="/agents/new">
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" />{t.agents.newAgent}</Button>
              </LocalizedLink>
            </div>
          </div>
        </SlideUp>
      ) : (
        <FadeIn>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <div className="grid grid-cols-[1fr_80px_120px_64px_80px_36px] items-center gap-x-3 px-4 py-2 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                <span>Agent</span>
                <span>Domain</span>
                <span>Model</span>
                <span className="text-right">Score</span>
                <span className="text-right">Version</span>
                <span />
              </div>
              <div className="divide-y">
                {agents.map((agent) => {
                  const domainColor = DOMAIN_COLORS[agent.domain?.toLowerCase() ?? ""] ?? "bg-gray-500/10 text-gray-700 dark:text-gray-400";
                  return (
                    <div
                      key={agent.id}
                      className="grid grid-cols-[1fr_80px_120px_64px_80px_36px] items-center gap-x-3 px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/agents/${agent.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AgentAvatar branding={agent.branding} size="sm" className="shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{agent.name}</p>
                          {agent.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{agent.description}</p>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${domainColor}`}>
                        {agent.domain || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {agent.modelId || "—"}
                      </span>
                      <span className="text-xs text-right tabular-nums">
                        {agent.latestGradingScore != null
                          ? `${Math.round(agent.latestGradingScore * 100)}%`
                          : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground text-right">
                        v{agent.version ?? 1}
                      </span>
                      <LocalizedLink href={`/agents/${agent.id}/operator`} onClick={(e) => e.stopPropagation()}>
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                      </LocalizedLink>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Teams Table */}
      {teams.length > 0 && (
        <SlideUp delay={0.2}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">{t.teams.title}</h2>
              </div>
              <LocalizedLink href="/teams/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t.teams.newTeam}
                </Button>
              </LocalizedLink>
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <div className="grid grid-cols-[1fr_90px_64px_100px] items-center gap-x-3 px-4 py-2 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Team</span>
                  <span>Mode</span>
                  <span className="text-right">Agents</span>
                  <span className="text-right">Description</span>
                </div>
                <div className="divide-y">
                  {teams.map((team) => {
                    const modeColor = MODE_COLORS[team.executionMode] ?? MODE_COLORS.sequential;
                    return (
                      <div
                        key={team.id}
                        className="grid grid-cols-[1fr_90px_64px_100px] items-center gap-x-3 px-4 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/teams/${team.id}`)}
                      >
                        <p className="text-sm font-medium truncate">{team.name}</p>
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${modeColor}`}>
                          {team.executionMode}
                        </span>
                        <span className="text-xs text-muted-foreground text-right tabular-nums">
                          {team.agents?.length ?? 0}
                        </span>
                        <p className="text-[11px] text-muted-foreground truncate text-right">
                          {team.description || "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </SlideUp>
      )}

      <WelcomeWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
