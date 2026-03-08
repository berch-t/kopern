"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionEvent } from "@/lib/firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import {
  MessageSquare,
  Wrench,
  CheckCircle2,
  GitBranch,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface SessionTimelineProps {
  events: SessionEvent[];
}

const EVENT_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: typeof MessageSquare; label: string }
> = {
  message: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500",
    icon: MessageSquare,
    label: "Message",
  },
  tool_call: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500",
    icon: Wrench,
    label: "Tool Call",
  },
  tool_result: {
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-500",
    icon: CheckCircle2,
    label: "Tool Result",
  },
  sub_agent_spawn: {
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500",
    icon: GitBranch,
    label: "Sub-agent",
  },
  sub_agent_result: {
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500",
    icon: GitBranch,
    label: "Sub-agent Result",
  },
  error: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500",
    icon: AlertCircle,
    label: "Error",
  },
  compact: {
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-500",
    icon: MessageSquare,
    label: "Compact",
  },
  pipeline_step: {
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500",
    icon: GitBranch,
    label: "Pipeline Step",
  },
  team_member: {
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500",
    icon: GitBranch,
    label: "Team Member",
  },
};

function formatTimestamp(ts: Timestamp | null | undefined): string {
  if (!ts || !ts.toDate) return "--:--:--";
  const d = ts.toDate();
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncateData(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, null, 2);
  if (str.length > 300) return str.slice(0, 300) + "...";
  return str;
}

function TimelineEvent({ event, index }: { event: SessionEvent; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.message;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="relative flex gap-4 pb-6 last:pb-0"
    >
      {/* Vertical line */}
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bgColor}/15`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-xs ${config.color} border-current/30`}>
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>

        {/* Data preview */}
        {event.data && Object.keys(event.data).length > 0 && (
          <div className="mt-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {expanded ? "Hide" : "Show"} data
            </Button>

            <AnimatePresence>
              {expanded && (
                <motion.pre
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-1 overflow-hidden rounded-md border bg-muted p-3 text-xs font-mono leading-relaxed"
                >
                  {truncateData(event.data)}
                </motion.pre>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function SessionTimeline({ events }: SessionTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">No events recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <TimelineEvent key={i} event={event} index={i} />
      ))}
    </div>
  );
}
