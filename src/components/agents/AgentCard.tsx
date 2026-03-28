"use client";

import { LocalizedLink } from "@/components/LocalizedLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type AgentDoc } from "@/lib/firebase/firestore";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { LayoutDashboard } from "lucide-react";

interface AgentCardProps {
  agent: AgentDoc & { id: string };
}

const domainColors: Record<string, string> = {
  accounting: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  legal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  devops: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  support: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  sales: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export function AgentCard({ agent }: AgentCardProps) {
  const colorClass = domainColors[agent.domain] || domainColors.default;
  const t = useDictionary();
  const router = useLocalizedRouter();

  return (
    <LocalizedLink href={`/agents/${agent.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <AgentAvatar branding={agent.branding} size="md" />
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">{agent.name}</CardTitle>
            <Badge variant="secondary" className={colorClass}>
              {agent.domain}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {agent.description || "No description"}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>v{agent.version}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/agents/${agent.id}/operator`);
                }}
                className="flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer"
              >
                <LayoutDashboard className="h-3 w-3" />
                {t.agents.detail.operatorView}
              </button>
            </div>
            {agent.latestGradingScore !== null && (
              <span className="flex items-center gap-1">
                Score:{" "}
                <AnimatedCounter
                  value={agent.latestGradingScore * 100}
                  suffix="%"
                  className="font-semibold text-foreground"
                />
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </LocalizedLink>
  );
}
