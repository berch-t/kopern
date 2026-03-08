"use client";

import { useEffect, useState } from "react";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import {
  agentsCollection,
  type AgentDoc,
  type McpServerDoc,
} from "@/lib/firebase/firestore";
import { listMcpServers } from "@/actions/mcp-servers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { AgentCard } from "@/components/agents/AgentCard";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import {
  Plus,
  Bot,
  Cable,
  Activity,
  Server,
  Key,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

interface ServerWithAgent extends McpServerDoc {
  id: string;
  agentId: string;
  agentName: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const t = useDictionary();
  const { data: agents, loading } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );

  const [servers, setServers] = useState<ServerWithAgent[]>([]);
  const [serversLoading, setServersLoading] = useState(true);

  useEffect(() => {
    if (!user || agents.length === 0) {
      setServersLoading(false);
      return;
    }
    async function loadServers() {
      const results: ServerWithAgent[] = [];
      for (const agent of agents) {
        const agentServers = await listMcpServers(user!.uid, agent.id);
        for (const s of agentServers) {
          results.push({ ...s, agentId: agent.id, agentName: agent.name });
        }
      }
      setServers(results);
      setServersLoading(false);
    }
    loadServers();
  }, [user, agents]);

  const activeServers = servers.filter((s) => s.enabled);
  const publishedAgents = agents.filter((a) => a.isPublished);
  const avgScore = agents
    .filter((a) => a.latestGradingScore !== null)
    .reduce((acc, a, _, arr) => acc + (a.latestGradingScore! / arr.length), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
            <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
          </div>
          <LocalizedLink href="/agents/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t.dashboard.newAgent}
            </Button>
          </LocalizedLink>
        </div>
      </SlideUp>

      {/* Stats Cards */}
      <FadeIn delay={0.1}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.dashboard.stats.agents}</p>
                <p className="text-2xl font-bold">
                  <AnimatedCounter value={agents.length} />
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.dashboard.stats.published}</p>
                <p className="text-2xl font-bold">
                  <AnimatedCounter value={publishedAgents.length} />
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Cable className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.dashboard.stats.apiEndpoints}</p>
                <p className="text-2xl font-bold">
                  <AnimatedCounter value={activeServers.length} />
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Activity className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.dashboard.stats.avgScore}</p>
                <p className="text-2xl font-bold">
                  {agents.some((a) => a.latestGradingScore !== null) ? (
                    <AnimatedCounter value={Math.round(avgScore * 100)} suffix="%" />
                  ) : (
                    <span className="text-muted-foreground text-base">{t.dashboard.stats.na}</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* Recent Agents */}
      <FadeIn delay={0.2}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t.dashboard.recentAgents}</h2>
            <LocalizedLink href="/agents">
              <Button variant="ghost" size="sm" className="gap-1">
                {t.common.viewAll} <ArrowRight className="h-3 w-3" />
              </Button>
            </LocalizedLink>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-lg border bg-muted" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t.dashboard.noAgents}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.dashboard.noAgentsDesc}
              </p>
              <LocalizedLink href="/agents/new">
                <Button className="mt-3" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.dashboard.createAgent}
                </Button>
              </LocalizedLink>
            </div>
          ) : (
            <StaggerChildren className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.slice(0, 6).map((agent) => (
                <motion.div key={agent.id} variants={staggerItem}>
                  <AgentCard agent={agent} />
                </motion.div>
              ))}
            </StaggerChildren>
          )}
        </div>
      </FadeIn>

      {/* MCP Servers */}
      <FadeIn delay={0.3}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t.dashboard.apiEndpoints}</h2>
            <LocalizedLink href="/api-keys">
              <Button variant="ghost" size="sm" className="gap-1">
                {t.common.viewAll} <ArrowRight className="h-3 w-3" />
              </Button>
            </LocalizedLink>
          </div>

          {serversLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted" />
              ))}
            </div>
          ) : servers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                <Cable className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>{t.dashboard.noEndpoints}</p>
                <p className="mt-1">
                  {t.dashboard.noEndpointsDesc}
                </p>
              </CardContent>
            </Card>
          ) : (
            <StaggerChildren className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servers.slice(0, 6).map((server) => (
                <motion.div key={`${server.agentId}-${server.id}`} variants={staggerItem}>
                  <LocalizedLink href={`/agents/${server.agentId}/mcp-servers/${server.id}`}>
                    <Card className="cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{server.name}</span>
                          </div>
                          <Badge variant={server.enabled ? "default" : "secondary"}>
                            {server.enabled ? t.common.active : t.common.disabled}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3" /> {server.agentName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Key className="h-3 w-3" />
                            <span className="font-mono">{server.apiKeyPrefix}...</span>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </LocalizedLink>
                </motion.div>
              ))}
            </StaggerChildren>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
