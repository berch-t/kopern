"use client";

import { useState, useRef, useCallback } from "react";
import { useCollection } from "@/hooks/useFirestore";
import { gradingSuitesCollection } from "@/lib/firebase/firestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AutoFixButtonProps {
  userId: string;
  agentId: string;
}

export default function AutoFixButton({ userId, agentId }: AutoFixButtonProps) {
  const t = useDictionary();
  const { data: suites } = useCollection(gradingSuitesCollection(userId, agentId));
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [diagnosticCount, setDiagnosticCount] = useState(0);
  const [statusText, setStatusText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const hasSuites = suites && suites.length > 0;

  const runAutoFix = useCallback(async () => {
    if (!hasSuites || state === "running") return;

    setState("running");
    setDiagnosticCount(0);
    setStatusText(t.operator.improve.running);

    const suiteId = suites[0].id;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/agents/${agentId}/autoresearch/autofix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, suiteId, runId: "latest" }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setState("idle");
        setStatusText(t.operator.improve.error);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let count = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === "status") {
                setStatusText(String(data.status));
              } else if (eventType === "diagnostic") {
                count++;
                setDiagnosticCount(count);
              } else if (eventType === "result") {
                setDiagnosticCount(data.diagnostics?.length ?? count);
              }
            } catch {
              // skip
            }
            eventType = "";
          }
        }
      }

      setState("done");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setState("idle");
        setStatusText(t.operator.improve.error);
      }
    } finally {
      abortRef.current = null;
    }
  }, [hasSuites, suites, state, agentId, userId, t]);

  if (state === "done") {
    return (
      <FadeIn>
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{t.operator.improve.done.replace("{count}", String(diagnosticCount))}</span>
        </div>
      </FadeIn>
    );
  }

  if (!hasSuites) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="sm" disabled>
                <Sparkles className="h-4 w-4 mr-2" />
                {t.operator.improve.button}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t.operator.improve.noSuite}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={runAutoFix}
      disabled={state === "running"}
    >
      {state === "running" ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {statusText || t.operator.improve.running}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          {t.operator.improve.button}
        </>
      )}
    </Button>
  );
}
