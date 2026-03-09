"use client";

import { useState, useRef } from "react";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { useDictionary } from "@/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createAgent } from "@/actions/agents";
import { createSkill } from "@/actions/skills";
import { createTool } from "@/actions/tools";
import { createGradingSuite } from "@/actions/grading-suites";
import { createGradingCase } from "@/actions/grading-cases";
import { toast } from "sonner";

interface MetaAgentWizardProps {
  userId: string;
  onCreated?: (agentId: string) => void;
}

type WizardStep = "input" | "generating" | "review" | "error";

interface AgentSpec {
  name: string;
  domain: string;
  systemPrompt: string;
  skills: { name: string; content: string }[];
  tools: { name: string; description: string; parametersSchema: string; executeCode: string }[];
  gradingCases: { name: string; input: string; expected: string; criterionType: string }[];
  settings: { model?: string; thinking?: string; purposeGate?: string; tillDone?: string };
  rawSpec: string;
}

export function MetaAgentWizard({ userId, onCreated }: MetaAgentWizardProps) {
  const t = useDictionary();
  const router = useLocalizedRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<WizardStep>("input");
  const [streamText, setStreamText] = useState("");
  const [spec, setSpec] = useState<AgentSpec | null>(null);
  const [creating, setCreating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function reset() {
    setDescription("");
    setStep("input");
    setStreamText("");
    setSpec(null);
    setCreating(false);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }

  async function handleGenerate() {
    if (!description.trim() || description.trim().length < 10) return;

    setStep("generating");
    setStreamText("");
    setSpec(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agents/meta-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          modelProvider: "anthropic",
          modelId: "claude-sonnet-4-6",
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const evt = currentEvent;
              currentEvent = "";

              if (evt === "token") {
                accumulated += data.text;
                setStreamText(accumulated);
              } else if (evt === "spec") {
                setSpec(data as AgentSpec);
              } else if (evt === "done") {
                setStep("review");
              } else if (evt === "error") {
                throw new Error(data.message);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      // If we got stream text but no explicit spec event, try to use it
      if (!spec && accumulated) {
        setStep("review");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStep("error");
      toast.error((err as Error).message || "Generation failed");
    }
  }

  async function handleCreateAgent() {
    if (!spec && !streamText) return;

    setCreating(true);
    try {
      const agentName = spec?.name || extractName(description);
      const agentDomain = spec?.domain || "other";
      const agentPrompt = spec?.systemPrompt || streamText;

      const agentId = await createAgent(userId, {
        name: agentName,
        description: description.trim(),
        domain: agentDomain,
        systemPrompt: agentPrompt,
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-6",
        thinkingLevel: "off",
        builtinTools: ["read", "bash"],
      });

      // Create skills in sub-collection
      if (spec?.skills?.length) {
        await Promise.all(
          spec.skills.map((s) =>
            createSkill(userId, agentId, { name: s.name, description: s.name, content: s.content })
          )
        );
      }

      // Create tools in sub-collection
      if (spec?.tools?.length) {
        await Promise.all(
          spec.tools.map((t) =>
            createTool(userId, agentId, {
              name: t.name,
              label: t.name,
              description: t.description,
              parametersSchema: t.parametersSchema,
              executeCode: t.executeCode,
            })
          )
        );
      }

      // Create grading suite + cases
      if (spec?.gradingCases?.length) {
        const suiteId = await createGradingSuite(userId, agentId, {
          name: "Auto-generated Suite",
          description: `Generated from meta-agent for: ${agentName}`,
        });
        await Promise.all(
          spec.gradingCases.map((c, i) =>
            createGradingCase(userId, agentId, suiteId, {
              name: c.name,
              inputPrompt: c.input,
              expectedBehavior: c.expected,
              orderIndex: i,
              criteria: [
                {
                  id: crypto.randomUUID(),
                  type: c.criterionType as "output_match" | "schema_validation" | "tool_usage" | "safety_check" | "custom_script" | "llm_judge",
                  name: c.name,
                  config: {},
                  weight: 1,
                },
              ],
            })
          )
        );
      }

      toast.success(t.metaAgent.generated);
      setOpen(false);
      reset();

      if (onCreated) {
        onCreated(agentId);
      } else {
        router.push(`/agents/${agentId}`);
      }
    } catch {
      toast.error("Failed to create agent");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          {t.metaAgent.title}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t.metaAgent.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t.metaAgent.description}
          </p>
        </DialogHeader>

        {/* Step: Input */}
        {step === "input" && (
          <div className="space-y-4 mt-4">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.metaAgent.promptPlaceholder}
              className="min-h-[160px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {t.metaAgent.minChars}
            </p>
            <Button
              onClick={handleGenerate}
              disabled={!description.trim() || description.trim().length < 10}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t.metaAgent.generate}
            </Button>
          </div>
        )}

        {/* Step: Generating (streaming) */}
        {step === "generating" && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t.metaAgent.generating}
            </div>
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {streamText || "..."}
              </pre>
            </ScrollArea>
            <Button
              variant="outline"
              onClick={() => {
                abortRef.current?.abort();
                reset();
              }}
              className="w-full"
            >
              {t.common.cancel}
            </Button>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              {t.metaAgent.specReady}
            </div>

            {spec && (
              <div className="rounded-md border p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">{t.metaAgent.agentName}:</span>{" "}
                  {spec.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t.metaAgent.domain}:</span>{" "}
                  {spec.domain}
                </p>
                {spec.skills.length > 0 && (
                  <p className="text-sm">
                    <span className="font-medium">{t.metaAgent.skillsCount}:</span>{" "}
                    {spec.skills.length}
                  </p>
                )}
              </div>
            )}

            <ScrollArea className="h-[200px] rounded-md border p-4">
              <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed text-muted-foreground">
                {streamText}
              </pre>
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} className="flex-1">
                {t.metaAgent.startOver}
              </Button>
              <Button
                onClick={handleCreateAgent}
                disabled={creating}
                className="flex-1"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.common.creating}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t.metaAgent.createFromSpec}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {t.metaAgent.error}
            </div>
            <Button variant="outline" onClick={reset} className="w-full">
              {t.metaAgent.startOver}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function extractName(description: string): string {
  const words = description.trim().split(/\s+/).slice(0, 5);
  const name = words.join(" ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}
