"use client";

import { use, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument, useCollection } from "@/hooks/useFirestore";
import { agentDoc, skillsCollection, type AgentDoc, type SkillDoc } from "@/lib/firebase/firestore";
import { SlideUp } from "@/components/motion/SlideUp";
import { ChatContainer } from "@/components/playground/ChatContainer";
import { Badge } from "@/components/ui/badge";
import type { AgentPlaygroundConfig } from "@/hooks/useAgent";

export default function PlaygroundPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: agent } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null
  );
  const { data: skills } = useCollection<SkillDoc>(
    user ? skillsCollection(user.uid, agentId) : null
  );

  const agentConfig: AgentPlaygroundConfig | null = useMemo(() => {
    if (!agent) return null;
    return {
      systemPrompt: agent.systemPrompt,
      modelProvider: agent.modelProvider,
      modelId: agent.modelId,
      skills: skills.map((s) => ({ name: s.name, content: s.content })),
    };
  }, [agent, skills]);

  return (
    <div className="space-y-4">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Playground</h1>
            <p className="text-muted-foreground">
              Test your agent in real-time with streaming responses
            </p>
          </div>
          {agent && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{agent.modelProvider}</Badge>
              <Badge variant="secondary">{agent.modelId}</Badge>
            </div>
          )}
        </div>
      </SlideUp>
      <ChatContainer agentId={agentId} agentConfig={agentConfig} />
    </div>
  );
}
