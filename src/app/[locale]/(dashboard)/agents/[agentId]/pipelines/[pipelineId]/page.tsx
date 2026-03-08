"use client";

import { use, useState } from "react";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useAuth } from "@/hooks/useAuth";
import { useDocument, useCollection } from "@/hooks/useFirestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import {
  pipelineDoc,
  agentsCollection,
  type PipelineDoc,
  type AgentDoc,
} from "@/lib/firebase/firestore";
import { deletePipeline } from "@/actions/pipelines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { PipelineStepCard } from "@/components/pipelines/PipelineStepCard";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Trash2,
  Workflow,
  Loader2,
} from "lucide-react";

type StepStatus = "pending" | "running" | "completed" | "failed";

export default function PipelineDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; pipelineId: string }>;
}) {
  const { agentId, pipelineId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const router = useLocalizedRouter();

  const { data: pipeline, loading } = useDocument<PipelineDoc>(
    user ? pipelineDoc(user.uid, agentId, pipelineId) : null
  );

  const { data: agents } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );

  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);
  const [stepOutputs, setStepOutputs] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const getAgentName = (agentId: string): string => {
    return agentMap.get(agentId)?.name ?? "Unknown Agent";
  };

  const handleRun = async () => {
    if (!pipeline || !prompt.trim() || !user) return;
    setRunning(true);
    setStepStatuses(pipeline.steps.map(() => "pending"));
    setStepOutputs(pipeline.steps.map(() => ""));

    const steps = pipeline.steps.map((step) => {
      const agent = agentMap.get(step.agentId);
      return {
        agentId: step.agentId,
        agentName: agent?.name ?? "Unknown Agent",
        role: step.role,
        order: step.order,
        inputMapping: step.inputMapping,
        customInputTemplate: step.customInputTemplate,
        continueOnError: step.continueOnError,
        systemPrompt: agent?.systemPrompt ?? "",
        modelProvider: agent?.modelProvider ?? "anthropic",
        modelId: agent?.modelId ?? "claude-sonnet-4-20250514",
      };
    });

    try {
      const response = await fetch(
        `/api/agents/${agentId}/pipelines/${pipelineId}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            userId: user.uid,
            pipelineName: pipeline.name,
            steps,
          }),
        }
      );

      if (!response.ok || !response.body) {
        setRunning(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      const processEvent = (eventType: string, data: Record<string, unknown>) => {
        const stepIndex = data.stepIndex as number | undefined;

        switch (eventType) {
          case "step_start":
            if (stepIndex !== undefined) {
              setStepStatuses((prev) => {
                const next = [...prev];
                next[stepIndex] = "running";
                return next;
              });
            }
            break;

          case "step_token":
            if (stepIndex !== undefined) {
              const text = data.text as string;
              setStepOutputs((prev) => {
                const next = [...prev];
                next[stepIndex] = (next[stepIndex] ?? "") + text;
                return next;
              });
            }
            break;

          case "step_done":
            if (stepIndex !== undefined) {
              setStepStatuses((prev) => {
                const next = [...prev];
                next[stepIndex] = "completed";
                return next;
              });
              const result = data.result as string | undefined;
              if (result) {
                setStepOutputs((prev) => {
                  const next = [...prev];
                  next[stepIndex] = result;
                  return next;
                });
              }
            }
            break;

          case "step_error":
            if (stepIndex !== undefined) {
              setStepStatuses((prev) => {
                const next = [...prev];
                next[stepIndex] = "failed";
                return next;
              });
              const errorMsg = (data.message as string) ?? "Unknown error";
              setStepOutputs((prev) => {
                const next = [...prev];
                next[stepIndex] = `Error: ${errorMsg}`;
                return next;
              });
            }
            break;

          case "pipeline_done":
          case "pipeline_abort":
            setRunning(false);
            break;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            try {
              const data = JSON.parse(raw) as Record<string, unknown>;
              if (currentEvent) {
                processEvent(currentEvent, data);
              }
            } catch {
              // Skip malformed data lines
            }
            currentEvent = "";
          }
        }
      }

      setRunning(false);
    } catch {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deletePipeline(user.uid, agentId, pipelineId);
      router.push(`/agents/${agentId}/pipelines`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  if (!pipeline) {
    return <div className="text-destructive">Pipeline not found</div>;
  }

  const currentStep = stepStatuses.findIndex((s) => s === "running");
  const completedCount = stepStatuses.filter((s) => s === "completed").length;

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LocalizedLink href={`/agents/${agentId}/pipelines`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </LocalizedLink>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{pipeline.name}</h1>
                <Badge variant="secondary">
                  {pipeline.steps.length}{" "}
                  {pipeline.steps.length === 1 ? "step" : "steps"}
                </Badge>
              </div>
              {pipeline.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {pipeline.description}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? t.common.loading : t.common.delete}
          </Button>
        </div>
      </SlideUp>

      <FadeIn delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              {t.pipelines.execute}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder={t.playground.sendMessage}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={running}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleRun();
                  }
                }}
              />
              <Button
                onClick={handleRun}
                disabled={running || !prompt.trim()}
              >
                {running ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {running ? t.pipelines.executing : t.pipelines.execute}
              </Button>
            </div>

            {running && (
              <div className="text-sm text-muted-foreground">
                {t.pipelines.stepProgress
                  .replace("{current}", String(completedCount + 1))
                  .replace("{total}", String(pipeline.steps.length))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Separator />
      </FadeIn>

      <FadeIn delay={0.2}>
        <h2 className="text-lg font-semibold mb-4">{t.pipelines.steps}</h2>
      </FadeIn>

      <StaggerChildren className="space-y-0">
        {pipeline.steps.map((step, index) => (
          <motion.div key={index} variants={staggerItem}>
            <PipelineStepCard
              step={step}
              index={index}
              agentName={getAgentName(step.agentId)}
              isLast={index === pipeline.steps.length - 1}
              status={
                stepStatuses.length > 0 ? stepStatuses[index] : undefined
              }
              output={stepOutputs[index] || undefined}
            />
          </motion.div>
        ))}
      </StaggerChildren>

      {pipeline.steps.length === 0 && (
        <FadeIn delay={0.2}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Workflow className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t.pipelines.noPipelinesDesc}
            </p>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
