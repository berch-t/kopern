"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import {
  mcpServerDoc,
  type McpServerDoc,
  type McpUsageDoc,
} from "@/lib/firebase/firestore";
import { toggleMcpServer } from "@/actions/mcp-servers";
import { getMcpUsage } from "@/actions/mcp-servers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { ApiKeyDisplay } from "@/components/mcp/ApiKeyDisplay";
import { UsageStats } from "@/components/mcp/UsageStats";
import {
  ArrowLeft,
  Key,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Power,
  PowerOff,
} from "lucide-react";

export default function McpServerDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; serverId: string }>;
}) {
  const { agentId, serverId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const { data: server, loading } = useDocument<McpServerDoc>(
    user ? mcpServerDoc(user.uid, agentId, serverId) : null
  );

  const [newKey, setNewKey] = useState<string | null>(null);
  const [usage, setUsage] = useState<(McpUsageDoc & { yearMonth: string })[]>([]);
  const [toggling, setToggling] = useState(false);
  const [regenerating, setRegenating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMcpUsage(user.uid, agentId, serverId).then(setUsage);
  }, [user, agentId, serverId]);

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading...</div>;
  }

  if (!server) {
    return <div className="text-destructive">Server not found</div>;
  }

  const endpointUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/mcp`;

  const handleToggle = async () => {
    if (!user) return;
    setToggling(true);
    try {
      await toggleMcpServer(user.uid, agentId, serverId, !server.enabled);
    } finally {
      setToggling(false);
    }
  };

  const handleRegenerate = async () => {
    if (!user) return;
    setRegenating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/mcp/keys", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId, serverId }),
      });
      const data = await res.json();
      if (data.apiKey) {
        setNewKey(data.apiKey);
      }
    } finally {
      setRegenating(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/mcp/keys?agentId=${agentId}&serverId=${serverId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push(`/agents/${agentId}/mcp-servers`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(endpointUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/agents/${agentId}/mcp-servers`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{server.name}</h1>
              {server.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {server.description}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={server.enabled ? "default" : "secondary"}>
                  {server.enabled ? "Active" : "Disabled"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {server.rateLimitPerMinute} req/min
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggle}
              disabled={toggling}
            >
              {server.enabled ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" /> Disable
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" /> Enable
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </SlideUp>

      <FadeIn delay={0.1}>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endpoint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded border bg-muted px-3 py-2 text-sm font-mono">
                  POST {endpointUrl}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Key
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {regenerating ? "Regenerating..." : "Regenerate"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <code className="rounded border bg-muted px-3 py-2 text-sm font-mono">
                {server.apiKeyPrefix}...
              </code>
            </CardContent>
          </Card>

          <UsageStats usage={usage} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Start</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Bash / macOS / Linux / WSL</p>
                <pre className="overflow-x-auto rounded border bg-muted p-3 text-sm">
{`curl -X POST ${endpointUrl} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"completion/create","params":{"message":"Hello"},"id":1}'`}
                </pre>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">PowerShell</p>
                <pre className="overflow-x-auto rounded border bg-muted p-3 text-sm">
{`Invoke-WebRequest -Uri "${endpointUrl}" \`
  -Method POST -UseBasicParsing \`
  -Headers @{"Authorization"="Bearer YOUR_API_KEY";"Content-Type"="application/json"} \`
  -Body '{"jsonrpc":"2.0","method":"completion/create","params":{"message":"Hello"},"id":1}'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {newKey && (
        <ApiKeyDisplay
          apiKey={newKey}
          open={!!newKey}
          onClose={() => setNewKey(null)}
        />
      )}
    </div>
  );
}
