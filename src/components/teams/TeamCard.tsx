"use client";

import { LocalizedLink } from "@/components/LocalizedLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { type AgentTeamDoc } from "@/lib/firebase/firestore";

interface TeamCardProps {
  team: AgentTeamDoc & { id: string };
}

const modeColors: Record<string, string> = {
  parallel: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sequential: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  conditional: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export function TeamCard({ team }: TeamCardProps) {
  const colorClass = modeColors[team.executionMode] || modeColors.sequential;

  return (
    <LocalizedLink href={`/teams/${team.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">{team.name}</CardTitle>
            <Badge variant="secondary" className={colorClass}>
              {team.executionMode}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {team.description || "No description"}
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{team.agents.length} agent{team.agents.length !== 1 ? "s" : ""}</span>
          </div>
        </CardContent>
      </Card>
    </LocalizedLink>
  );
}
