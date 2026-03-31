"use client";

import { useState, useEffect } from "react";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { agentsCollection, agentTeamsCollection, type AgentDoc, type AgentTeamDoc } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Users } from "lucide-react";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { SlideUp } from "@/components/motion/SlideUp";
import { AgentCard } from "@/components/agents/AgentCard";
import { TeamCard } from "@/components/teams/TeamCard";
import { MetaAgentWizard } from "@/components/agents/MetaAgentWizard";
import { WelcomeWizard } from "@/components/onboarding/WelcomeWizard";
import { motion } from "framer-motion";

export default function AgentsPage() {
  const { user } = useAuth();
  const t = useDictionary();
  const locale = useLocale();
  const isFr = locale === "fr";
  const { data: agents, loading } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );
  const { data: teams } = useCollection<AgentTeamDoc>(
    user ? agentTeamsCollection(user.uid) : null,
    "updatedAt"
  );

  const [wizardOpen, setWizardOpen] = useState(false);

  // Auto-open wizard when user has no agents (first visit)
  useEffect(() => {
    if (!loading && agents.length === 0 && user) {
      setWizardOpen(true);
    }
  }, [loading, agents.length, user]);

  return (
    <div className="space-y-6">
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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <p className="text-lg font-medium">{t.agents.noAgents}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.agents.noAgentsDesc}
            </p>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => setWizardOpen(true)}>
                {t.agents.createAgent}
              </Button>
              <LocalizedLink href="/agents/new">
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.agents.newAgent}
                </Button>
              </LocalizedLink>
            </div>
          </div>
        </SlideUp>
      ) : (
        <StaggerChildren className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <motion.div key={agent.id} variants={staggerItem}>
              <AgentCard agent={agent} />
            </motion.div>
          ))}
        </StaggerChildren>
      )}

      {/* Teams Section */}
      {teams.length > 0 && (
        <SlideUp delay={0.2}>
          <div className="space-y-4">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          </div>
        </SlideUp>
      )}

      {/* Welcome Wizard — onboarding for new users */}
      <WelcomeWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
