"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import {
  agentsCollection,
  type AgentDoc,
  type McpServerDoc,
} from "@/lib/firebase/firestore";
import { listMcpServers } from "@/actions/mcp-servers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { Cable, Server, Key, Bot } from "lucide-react";
import { motion } from "framer-motion";

interface ServerWithAgent extends McpServerDoc {
  id: string;
  agentId: string;
  agentName: string;
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { data: agents } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );

  const [servers, setServers] = useState<ServerWithAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || agents.length === 0) {
      setLoading(false);
      return;
    }

    async function loadAll() {
      const results: ServerWithAgent[] = [];
      for (const agent of agents) {
        const agentServers = await listMcpServers(user!.uid, agent.id);
        for (const s of agentServers) {
          results.push({ ...s, agentId: agent.id, agentName: agent.name });
        }
      }
      setServers(results);
      setLoading(false);
    }

    loadAll();
  }, [user, agents]);

  return (
    <div className="space-y-6">
      <SlideUp>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Cable className="h-8 w-8" />
            API Endpoints
          </h1>
          <p className="text-muted-foreground mt-1">
            All MCP servers across your agents
          </p>
        </div>
      </SlideUp>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : servers.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <p className="text-lg font-medium">No API endpoints yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Go to an agent&apos;s detail page and create an MCP server to expose it as an API
            </p>
          </div>
        </SlideUp>
      ) : (
        <StaggerChildren className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <motion.div key={`${server.agentId}-${server.id}`} variants={staggerItem}>
              <Link href={`/agents/${server.agentId}/mcp-servers/${server.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{server.name}</span>
                      </div>
                      <Badge variant={server.enabled ? "default" : "secondary"}>
                        {server.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Bot className="h-3 w-3" />
                      <span>{server.agentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Key className="h-3 w-3" />
                      <span className="font-mono">{server.apiKeyPrefix}...</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </StaggerChildren>
      )}
    </div>
  );
}
