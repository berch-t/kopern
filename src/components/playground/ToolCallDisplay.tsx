"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Wrench, AlertCircle } from "lucide-react";
import { type ToolCallInfo } from "@/hooks/useAgent";
import { cn } from "@/lib/utils";

interface ToolCallDisplayProps {
  toolCall: ToolCallInfo;
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-md border text-xs",
        toolCall.isError ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/50"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {toolCall.isError ? (
          <AlertCircle className="h-3 w-3 text-destructive" />
        ) : (
          <Wrench className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="font-mono font-medium">{toolCall.name}</span>
        {toolCall.result !== undefined && (
          <span className="ml-auto text-muted-foreground">
            {toolCall.isError ? "Error" : "Done"}
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t"
          >
            <div className="space-y-2 p-3">
              <div>
                <span className="font-semibold text-muted-foreground">Args:</span>
                <pre className="mt-1 overflow-x-auto rounded bg-background p-2 font-mono">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>
              {toolCall.result !== undefined && (
                <div>
                  <span className="font-semibold text-muted-foreground">Result:</span>
                  <pre className="mt-1 overflow-x-auto rounded bg-background p-2 font-mono">
                    {toolCall.result}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
