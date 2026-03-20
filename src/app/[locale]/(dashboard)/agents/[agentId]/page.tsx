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
  Workflow,
  Activity,
  FlaskConical,
  Plug,
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
    { href: `/agents/${agentId}/edit`, label: t.agents.detail.editConfig, icon: Pencil, accent: "text-slate-500", bg: "bg-slate-500/10" },
    { href: `/agents/${agentId}/skills`, label: t.agents.detail.skills, icon: BookOpen, accent: "text-blue-500", bg: "bg-blue-500/10" },
    { href: `/agents/${agentId}/tools`, label: t.agents.detail.tools, icon: Wrench, accent: "text-amber-500", bg: "bg-amber-500/10" },
    { href: `/agents/${agentId}/extensions`, label: t.agents.detail.extensions, icon: Puzzle, accent: "text-purple-500", bg: "bg-purple-500/10" },
    { href: `/agents/${agentId}/playground`, label: t.agents.detail.playground, icon: MessageSquare, accent: "text-emerald-500", bg: "bg-emerald-500/10" },
    { href: `/agents/${agentId}/grading`, label: t.agents.detail.grading, icon: ClipboardCheck, accent: "text-cyan-500", bg: "bg-cyan-500/10" },
    { href: `/agents/${agentId}/optimize`, label: t.agents.detail.optimize, icon: FlaskConical, accent: "text-pink-500", bg: "bg-pink-500/10" },
    { href: `/agents/${agentId}/mcp-servers`, label: t.agents.detail.mcpServers, icon: Server, accent: "text-indigo-500", bg: "bg-indigo-500/10" },
    { href: `/agents/${agentId}/pipelines`, label: t.pipelines.title, icon: Workflow, accent: "text-orange-500", bg: "bg-orange-500/10" },
    { href: `/agents/${agentId}/connectors`, label: t.connectors.title, icon: Plug, accent: "text-rose-500", bg: "bg-rose-500/10" },
    { href: `/agents/${agentId}/sessions`, label: t.sessions.title, icon: Activity, accent: "text-teal-500", bg: "bg-teal-500/10" },
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
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${link.bg}`}>
                        <link.icon className={`h-4 w-4 ${link.accent}`} />
                      </div>
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
