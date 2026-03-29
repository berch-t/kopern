"use client";

import { useState, useRef, useCallback } from "react";
import { useCollection } from "@/hooks/useFirestore";
import { gradingSuitesCollection } from "@/lib/firebase/firestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";

interface AutoFixButtonProps {
  userId: string;
  agentId: string;
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  fr: {
    loading: "Chargement...",
    generating_suite: "Analyse de l'agent et creation des tests...",
    grading: "Evaluation en cours...",
    loading_results: "Chargement des resultats...",
    analyzing: "Analyse des points faibles...",
    validating: "Verification des ameliorations...",
  },
  en: {
    loading: "Loading...",
    generating_suite: "Analyzing agent and creating tests...",
    grading: "Running evaluation...",
    loading_results: "Loading results...",
    analyzing: "Analyzing weaknesses...",
    validating: "Verifying improvements...",
  },
};

export default function AutoFixButton({ userId, agentId }: AutoFixButtonProps) {
  const t = useDictionary();
  const { data: suites } = useCollection(gradingSuitesCollection(userId, agentId));
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [diagnosticCount, setDiagnosticCount] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [scoreInfo, setScoreInfo] = useState<{ before: number; after: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Detect locale from dictionary
  const locale = t.operator?.improve?.button ? (t.operator.improve.button === "Ameliorer l'agent" ? "fr" : "en") : "en";
  const labels = STATUS_LABELS[locale] || STATUS_LABELS.en;

  const runAutoFix = useCallback(async () => {
    if (state === "running") return;

    setState("running");
    setDiagnosticCount(0);
    setScoreInfo(null);
    setStatusText(labels.loading);

    // Use first suite if available, otherwise "_auto" triggers auto-generation
    const suiteId = suites && suites.length > 0 ? suites[0].id : "_auto";
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
        setStatusText(t.operator?.improve?.error || "Error");
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
                const key = String(data.status);
                setStatusText(labels[key] || key);
              } else if (eventType === "diagnostic") {
                count++;
                setDiagnosticCount(count);
              } else if (eventType === "result") {
                setDiagnosticCount(data.diagnostics?.length ?? count);
                if (data.originalScore !== undefined && data.newScore !== undefined) {
                  setScoreInfo({ before: data.originalScore, after: data.newScore });
                }
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
        setStatusText(t.operator?.improve?.error || "Error");
      }
    } finally {
      abortRef.current = null;
    }
  }, [suites, state, agentId, userId, t, labels]);

  if (state === "done") {
    const scoreText = scoreInfo
      ? ` (${Math.round(scoreInfo.before * 100)}% → ${Math.round(scoreInfo.after * 100)}%)`
      : "";
    return (
      <FadeIn>
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            {(t.operator?.improve?.done || "{count} improvement(s) found and applied").replace("{count}", String(diagnosticCount))}
            {scoreText}
          </span>
        </div>
      </FadeIn>
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
          {statusText}
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          {t.operator?.improve?.button || "Improve agent"}
        </>
      )}
    </Button>
  );
}
