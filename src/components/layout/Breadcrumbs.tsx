"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import {
  agentDoc,
  mcpServerDoc,
  agentTeamDoc,
  type AgentDoc,
  type McpServerDoc,
  type AgentTeamDoc,
} from "@/lib/firebase/firestore";
import { ChevronRight } from "lucide-react";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";
import { locales } from "@/i18n/config";

function useEntityName(segments: string[], staticLabels: Record<string, string>) {
  const { user } = useAuth();

  const agentIdx = segments.indexOf("agents");
  const agentId =
    agentIdx !== -1 && agentIdx + 1 < segments.length
      ? segments[agentIdx + 1]
      : null;

  const mcpIdx = segments.indexOf("mcp-servers");
  const serverId =
    mcpIdx !== -1 && mcpIdx + 1 < segments.length
      ? segments[mcpIdx + 1]
      : null;

  const teamIdx = segments.indexOf("teams");
  const teamId =
    teamIdx !== -1 && teamIdx + 1 < segments.length
      ? segments[teamIdx + 1]
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

  const { data: team } = useDocument<AgentTeamDoc>(
    user && teamId && !staticLabels[teamId]
      ? agentTeamDoc(user.uid, teamId)
      : null
  );

  const names: Record<string, string> = {};
  if (agentId && agent) names[agentId] = agent.name;
  if (serverId && mcpServer) names[serverId] = mcpServer.name;
  if (teamId && team) names[teamId] = team.name;

  return names;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useDictionary();

  const staticLabels: Record<string, string> = {
    dashboard: t.breadcrumbs.dashboard,
    agents: t.breadcrumbs.agents,
    edit: t.breadcrumbs.edit,
    skills: t.breadcrumbs.skills,
    tools: t.breadcrumbs.tools,
    extensions: t.breadcrumbs.extensions,
    playground: t.breadcrumbs.playground,
    grading: t.breadcrumbs.grading,
    "mcp-servers": t.breadcrumbs.mcpServers,
    "api-keys": t.breadcrumbs.apiKeys,
    examples: t.breadcrumbs.examples,
    docs: t.breadcrumbs.docs,
    settings: t.breadcrumbs.settings,
    new: t.breadcrumbs.new,
    runs: t.breadcrumbs.runs,
    pricing: t.breadcrumbs.pricing,
    teams: t.breadcrumbs.teams,
    pipelines: t.breadcrumbs.pipelines,
    sessions: t.breadcrumbs.sessions,
    bugs: t.breadcrumbs.bugs,
    billing: t.breadcrumbs.billing,
  };

  // Remove locale prefix from segments
  const allSegments = pathname.split("/").filter(Boolean);
  const segments = allSegments.filter((s) => !locales.includes(s as typeof locale));
  const entityNames = useEntityName(segments, staticLabels);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    // Build href with locale prefix
    const href = "/" + [locale, ...segments.slice(0, index + 1)].join("/");

    const label =
      entityNames[segment] ||
      staticLabels[segment] ||
      segment.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return { href, label };
  });

  return (
    <nav className="flex items-center gap-1 px-6 py-2 text-sm text-muted-foreground">
      <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
        {t.breadcrumbs.home}
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
