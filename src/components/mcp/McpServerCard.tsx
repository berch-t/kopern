"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Key } from "lucide-react";
import type { McpServerDoc } from "@/lib/firebase/firestore";

interface McpServerCardProps {
  server: McpServerDoc & { id: string };
  agentId: string;
}

export function McpServerCard({ server, agentId }: McpServerCardProps) {
  return (
    <Link href={`/agents/${agentId}/mcp-servers/${server.id}`}>
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
          {server.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {server.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Key className="h-3 w-3" />
            <span className="font-mono">{server.apiKeyPrefix}...</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Rate limit: {server.rateLimitPerMinute} req/min
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
