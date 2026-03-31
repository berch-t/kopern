"use client";

import type { TaskDoc, TaskPriority } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { GripVertical, User, Flag } from "lucide-react";

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string }> = {
  critical: { color: "bg-red-500/15 text-red-700 dark:text-red-400", label: "Critical" },
  high: { color: "bg-orange-500/15 text-orange-700 dark:text-orange-400", label: "High" },
  medium: { color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", label: "Medium" },
  low: { color: "bg-gray-500/15 text-gray-700 dark:text-gray-400", label: "Low" },
};

interface TaskCardProps {
  task: TaskDoc & { id: string };
  agentName?: string;
  onStatusChange?: (taskId: string, status: TaskDoc["status"]) => void;
  dragHandle?: boolean;
}

export function TaskCard({ task, agentName, dragHandle }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-default">
      <div className="flex items-start gap-2">
        {dragHandle && (
          <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 cursor-grab shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${priority.color}`}>
              <Flag className="h-2.5 w-2.5" />
              {priority.label}
            </span>
            {agentName && (
              <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-violet-500/15 text-violet-700 dark:text-violet-400">
                <User className="h-2.5 w-2.5" />
                {agentName}
              </span>
            )}
            {task.checkedOutBy && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400">
                In progress
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
