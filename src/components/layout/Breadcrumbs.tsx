"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import {
  agentDoc,
  mcpServerDoc,
  type AgentDoc,
  type McpServerDoc,
} from "@/lib/firebase/firestore";
import { ChevronRight } from "lucide-react";

// Readable labels for known route segments
const staticLabels: Record<string, string> = {
  dashboard: "Dashboard",
  agents: "Agents",
  edit: "Edit",
  skills: "Skills",
  tools: "Tools",
  extensions: "Extensions",
  playground: "Playground",
  grading: "Grading",
  "mcp-servers": "MCP Servers",
  "api-keys": "API",
  docs: "Documentation",
  settings: "Settings",
  new: "New",
  runs: "Runs",
};

function useEntityName(segments: string[]) {
  const { user } = useAuth();

  // Detect agentId: segments like ["agents", "<id>", ...]
  const agentIdx = segments.indexOf("agents");
  const agentId =
    agentIdx !== -1 && agentIdx + 1 < segments.length
      ? segments[agentIdx + 1]
      : null;

  // Detect serverId: segments like [..., "mcp-servers", "<id>"]
  const mcpIdx = segments.indexOf("mcp-servers");
  const serverId =
    mcpIdx !== -1 && mcpIdx + 1 < segments.length
      ? segments[mcpIdx + 1]
      : null;

  const { data: agent } = useDocument<AgentDoc>(
    user && agentId && !staticLabels[agentId]
      ? agentDoc(user.uid, agentId)
      : null
  );

  const { data: mcpServer } = useDocument<McpServerDoc>(
    user && agentId && serverId && !staticLabels[serverId]
      ? mcpServerDoc(user.uid, agentId, serverId)
      : null
  );

  const names: Record<string, string> = {};
  if (agentId && agent) names[agentId] = agent.name;
  if (serverId && mcpServer) names[serverId] = mcpServer.name;

  return names;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const entityNames = useEntityName(segments);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");

    // Priority: entity name from Firestore > static label > formatted segment
    const label =
      entityNames[segment] ||
      staticLabels[segment] ||
      segment.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return { href, label };
  });

  return (
    <nav className="flex items-center gap-1 px-6 py-2 text-sm text-muted-foreground">
      <Link href="/" className="hover:text-foreground transition-colors">
        Home
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <Link href={crumb.href} className="hover:text-foreground transition-colors">
            {crumb.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
