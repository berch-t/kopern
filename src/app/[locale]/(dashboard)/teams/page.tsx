"use client";

import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { agentTeamsCollection, type AgentTeamDoc } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { SlideUp } from "@/components/motion/SlideUp";
import { TeamCard } from "@/components/teams/TeamCard";
import { motion } from "framer-motion";

export default function TeamsPage() {
  const { user } = useAuth();
  const t = useDictionary();
  const { data: teams, loading } = useCollection<AgentTeamDoc>(
    user ? agentTeamsCollection(user.uid) : null,
    "updatedAt"
  );

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t.teams.title}</h1>
          <LocalizedLink href="/teams/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t.teams.newTeam}
            </Button>
          </LocalizedLink>
        </div>
      </SlideUp>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <p className="text-lg font-medium">{t.teams.noTeams}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.teams.noTeamsDesc}
            </p>
            <LocalizedLink href="/teams/new">
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {t.teams.createTeam}
              </Button>
            </LocalizedLink>
          </div>
        </SlideUp>
      ) : (
        <StaggerChildren className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <motion.div key={team.id} variants={staggerItem}>
              <TeamCard team={team} />
            </motion.div>
          ))}
        </StaggerChildren>
      )}
    </div>
  );
}
