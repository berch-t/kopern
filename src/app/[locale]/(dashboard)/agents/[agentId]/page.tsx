"use client";

import { use } from "react";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { agentDoc, type AgentDoc } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { GitHubConnector } from "@/components/agents/GitHubConnector";
import {
  Pencil,
  BookOpen,
  Wrench,
  Puzzle,
  MessageSquare,
  ClipboardCheck,
  Server,
} from "lucide-react";

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: agent, loading } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null
  );
  const t = useDictionary();

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">{t.agents.detail.loadingAgent}</div>;
  }

  if (!agent) {
    return <div className="text-destructive">{t.agents.detail.notFound}</div>;
  }

  const links = [
    { href: `/agents/${agentId}/edit`, label: t.agents.detail.editConfig, icon: Pencil },
    { href: `/agents/${agentId}/skills`, label: t.agents.detail.skills, icon: BookOpen },
    { href: `/agents/${agentId}/tools`, label: t.agents.detail.tools, icon: Wrench },
    { href: `/agents/${agentId}/extensions`, label: t.agents.detail.extensions, icon: Puzzle },
    { href: `/agents/${agentId}/playground`, label: t.agents.detail.playground, icon: MessageSquare },
    { href: `/agents/${agentId}/grading`, label: t.agents.detail.grading, icon: ClipboardCheck },
    { href: `/agents/${agentId}/mcp-servers`, label: t.agents.detail.mcpServers, icon: Server },
  ];

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{agent.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary">{agent.domain}</Badge>
              <span className="text-sm text-muted-foreground">v{agent.version}</span>
              {agent.isPublished && <Badge variant="default">{t.common.published}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GitHubConnector agentId={agentId} connectedRepos={agent.connectedRepos ?? []} />
            {agent.latestGradingScore !== null && (
              <div className="text-sm text-muted-foreground text-right">
                {t.agents.detail.gradingScore}
                <div className="text-2xl font-bold text-foreground">
                  <AnimatedCounter value={agent.latestGradingScore * 100} suffix="%" />
                </div>
              </div>
            )}
          </div>
        </div>
      </SlideUp>

      <FadeIn delay={0.1}>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t.agents.detail.overview}</TabsTrigger>
            <TabsTrigger value="prompt">{t.agents.detail.systemPrompt}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t.agents.detail.configuration}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.agents.detail.provider}</span>
                  <span>{agent.modelProvider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.agents.detail.model}</span>
                  <span>{agent.modelId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.agents.detail.thinking}</span>
                  <span>{agent.thinkingLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.agents.detail.builtinTools}</span>
                  <span>{agent.builtinTools.join(", ") || t.common.none}</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((link) => (
                <LocalizedLink key={link.href} href={link.href}>
                  <Card className="cursor-pointer transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-3 p-4">
                      <link.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{link.label}</span>
                    </CardContent>
                  </Card>
                </LocalizedLink>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="prompt">
            <Card>
              <CardContent className="p-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {agent.systemPrompt || t.agents.detail.noPrompt}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </FadeIn>
    </div>
  );
}
