"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listTeamGoals } from "@/actions/goals";
import type { GoalDoc, GoalStatus } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion/FadeIn";
import { Target, ChevronRight, ChevronDown, Loader2 } from "lucide-react";

const STATUS_CONFIG: Record<GoalStatus, { color: string; label: string }> = {
  not_started: { color: "bg-gray-500/15 text-gray-700 dark:text-gray-400", label: "Not started" },
  in_progress: { color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", label: "In progress" },
  completed: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", label: "Completed" },
  cancelled: { color: "bg-red-500/15 text-red-700 dark:text-red-400", label: "Cancelled" },
};

interface GoalTreeProps {
  teamId: string;
}

function GoalNode({ goal, children, depth }: { goal: GoalDoc & { id: string }; children: (GoalDoc & { id: string })[]; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const status = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.not_started;
  const hasChildren = children.length > 0;

  return (
    <div className={depth > 0 ? "ml-6 border-l pl-4" : ""}>
      <div
        className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <div className="w-3.5" />
        )}
        <Target className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1">{goal.title}</span>
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${status.color}`}>
          {status.label}
        </span>
        {/* Progress bar */}
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">{goal.progress}%</span>
      </div>
      {expanded && hasChildren && (
        <div className="mt-1">
          {children.map((child) => (
            <GoalNode key={child.id} goal={child} children={[]} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalTree({ teamId }: GoalTreeProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<(GoalDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listTeamGoals(user.uid, teamId)
      .then(setGoals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, teamId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // Build tree from flat list
  const rootGoals = goals.filter((g) => !g.parentGoalId);
  const childMap = new Map<string, (GoalDoc & { id: string })[]>();
  for (const g of goals) {
    if (g.parentGoalId) {
      const siblings = childMap.get(g.parentGoalId) ?? [];
      siblings.push(g);
      childMap.set(g.parentGoalId, siblings);
    }
  }

  if (goals.length === 0) {
    return (
      <FadeIn>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No goals defined</p>
            <p className="text-xs mt-1">Create goals to track your team objectives.</p>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <Card>
        <CardContent className="pt-4">
          {rootGoals.map((goal) => (
            <GoalNode
              key={goal.id}
              goal={goal}
              children={childMap.get(goal.id) ?? []}
              depth={0}
            />
          ))}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
