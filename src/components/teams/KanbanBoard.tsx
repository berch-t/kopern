"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listTasks, updateTask } from "@/actions/team-tasks";
import type { TaskDoc, TaskStatus, AgentDoc } from "@/lib/firebase/firestore";
import { TaskCard } from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "backlog", label: "Backlog", color: "text-gray-500" },
  { status: "ready", label: "Ready", color: "text-blue-500" },
  { status: "in_progress", label: "In Progress", color: "text-amber-500" },
  { status: "review", label: "Review", color: "text-purple-500" },
  { status: "done", label: "Done", color: "text-emerald-500" },
  { status: "blocked", label: "Blocked", color: "text-red-500" },
];

interface KanbanBoardProps {
  teamId: string;
  agents: (AgentDoc & { id: string })[];
  onAddTask?: () => void;
}

export function KanbanBoard({ teamId, agents, onAddTask }: KanbanBoardProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<(TaskDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    listTasks(user.uid, teamId)
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, teamId]);

  function getAgentName(agentId?: string) {
    if (!agentId) return undefined;
    return agents.find((a) => a.id === agentId)?.name;
  }

  async function handleDrop(taskId: string, newStatus: TaskStatus) {
    if (!user) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
    await updateTask(user.uid, teamId, taskId, { status: newStatus });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">Tasks</h3>
        {onAddTask && (
          <Button variant="outline" size="sm" onClick={onAddTask}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Task
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div
              key={col.status}
              className="min-h-[200px]"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("text/task-id");
                if (taskId) handleDrop(taskId, col.status);
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${col.color}`}>
                  {col.label}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {columnTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/task-id", task.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <TaskCard
                      task={task}
                      agentName={getAgentName(task.assigneeAgentId)}
                      dragHandle
                    />
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="text-[11px] text-muted-foreground">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </FadeIn>
  );
}
