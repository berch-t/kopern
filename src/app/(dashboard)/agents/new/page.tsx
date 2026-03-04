"use client";

import { SlideUp } from "@/components/motion/SlideUp";
import { AgentForm } from "@/components/agents/AgentForm";

export default function NewAgentPage() {
  return (
    <div className="space-y-6">
      <SlideUp>
        <h1 className="text-3xl font-bold">Create Agent</h1>
        <p className="text-muted-foreground">
          Set up a new AI agent with a system prompt, model, and domain
        </p>
      </SlideUp>
      <SlideUp delay={0.1}>
        <AgentForm />
      </SlideUp>
    </div>
  );
}
