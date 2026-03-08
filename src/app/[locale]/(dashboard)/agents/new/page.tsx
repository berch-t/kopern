"use client";

import { SlideUp } from "@/components/motion/SlideUp";
import { AgentForm } from "@/components/agents/AgentForm";
import { useDictionary } from "@/providers/LocaleProvider";

export default function NewAgentPage() {
  const t = useDictionary();

  return (
    <div className="space-y-6">
      <SlideUp>
        <h1 className="text-3xl font-bold">{t.agents.createTitle}</h1>
        <p className="text-muted-foreground">
          {t.agents.createSubtitle}
        </p>
      </SlideUp>
      <SlideUp delay={0.1}>
        <AgentForm />
      </SlideUp>
    </div>
  );
}
