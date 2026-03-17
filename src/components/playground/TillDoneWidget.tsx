"use client";

import { useState } from "react";
import { useDictionary } from "@/providers/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ListChecks, Trash2 } from "lucide-react";

interface TillDoneTask {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done";
}

interface TillDoneWidgetProps {
  tasks: TillDoneTask[];
  onClear: () => void;
}

const STATUS_STYLES: Record<
  TillDoneTask["status"],
  { variant: "default" | "secondary" | "outline"; className: string }
> = {
  pending: {
    variant: "outline",
    className: "border-muted-foreground/30 text-muted-foreground",
  },
  in_progress: {
    variant: "default",
    className: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  done: {
    variant: "secondary",
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  },
};

export function TillDoneWidget({ tasks, onClear }: TillDoneWidgetProps) {
  const t = useDictionary();
  const [confirmClear, setConfirmClear] = useState(false);

  const remaining = tasks.filter((task) => task.status !== "done").length;

  function handleClear() {
    if (confirmClear) {
      onClear();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  }

  function getStatusLabel(status: TillDoneTask["status"]): string {
    switch (status) {
      case "pending":
        return t.playground.tillDone.pending;
      case "in_progress":
        return t.playground.tillDone.inProgress;
      case "done":
        return t.playground.tillDone.done;
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              {t.playground.tillDone.title}
            </CardTitle>
          </div>
          {tasks.length > 0 && (
            <Button
              variant={confirmClear ? "destructive" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleClear}
              onBlur={() => setConfirmClear(false)}
            >
              {confirmClear ? (
                t.playground.tillDone.clearConfirm
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center">
            <p className="text-xs text-muted-foreground">
              {t.playground.tillDone.noTasks}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {tasks.map((task) => {
                const style = STATUS_STYLES[task.status];
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    <span
                      className={
                        task.status === "done"
                          ? "line-through text-muted-foreground"
                          : ""
                      }
                    >
                      {task.title}
                    </span>
                    <Badge
                      variant={style.variant}
                      className={`shrink-0 text-[10px] px-1.5 py-0 ${style.className}`}
                    >
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {remaining > 0 && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground text-center">
                  {remaining} {t.playground.tillDone.incomplete}
                </p>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
