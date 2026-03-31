"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listTeamActivity } from "@/actions/team-activity";
import type { TeamActivityDoc, TeamActivityAction } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/FadeIn";
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Workflow,
  UserPlus,
  UserMinus,
  Activity,
  Loader2,
} from "lucide-react";

const ACTION_CONFIG: Record<
  TeamActivityAction,
  { icon: typeof Activity; color: string; label: string }
> = {
  team_created: { icon: Plus, color: "text-emerald-500", label: "Team created" },
  team_updated: { icon: Pencil, color: "text-blue-500", label: "Team updated" },
  member_added: { icon: UserPlus, color: "text-violet-500", label: "Member added" },
  member_removed: { icon: UserMinus, color: "text-orange-500", label: "Member removed" },
  flow_updated: { icon: Workflow, color: "text-sky-500", label: "Flow updated" },
  execution_started: { icon: Play, color: "text-blue-500", label: "Execution started" },
  execution_completed: { icon: CheckCircle2, color: "text-emerald-500", label: "Execution completed" },
  execution_failed: { icon: XCircle, color: "text-red-500", label: "Execution failed" },
};

function formatRelative(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface ActivityTimelineProps {
  teamId: string;
}

export function ActivityTimeline({ teamId }: ActivityTimelineProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<(TeamActivityDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listTeamActivity(user.uid, teamId, 30)
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, teamId]);

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

              <div className="space-y-4">
                {activities.map((act) => {
                  const config = ACTION_CONFIG[act.action] ?? ACTION_CONFIG.team_updated;
                  const Icon = config.icon;
                  const ts = act.timestamp?.toDate?.() ?? new Date();

                  return (
                    <div key={act.id} className="flex items-start gap-3 relative">
                      <div className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border bg-background z-10 ${config.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-medium">{config.label}</p>
                        {act.details?.message ? (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {String(act.details.message)}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {formatRelative(ts)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
