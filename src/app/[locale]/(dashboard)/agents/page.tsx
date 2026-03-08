"use client";

import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { agentsCollection, type AgentDoc } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { SlideUp } from "@/components/motion/SlideUp";
import { AgentCard } from "@/components/agents/AgentCard";
import { MetaAgentWizard } from "@/components/agents/MetaAgentWizard";
import { motion } from "framer-motion";

export default function AgentsPage() {
  const { user } = useAuth();
  const t = useDictionary();
  const { data: agents, loading } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t.agents.title}</h1>
          <div className="flex gap-2">
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
            <LocalizedLink href="/agents/new">
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {t.agents.createAgent}
              </Button>
            </LocalizedLink>
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
    </div>
  );
}
