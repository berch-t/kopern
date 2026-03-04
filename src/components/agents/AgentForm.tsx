"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModelSelector } from "./ModelSelector";
import { SystemPromptEditor } from "./SystemPromptEditor";
import { useAuth } from "@/hooks/useAuth";
import { createAgent } from "@/actions/agents";
import { toast } from "sonner";
import type { AgentDoc } from "@/lib/firebase/firestore";

const DOMAINS = [
  "accounting",
  "legal",
  "devops",
  "support",
  "sales",
  "marketing",
  "engineering",
  "hr",
  "finance",
  "other",
];

const STEPS = ["Basics", "Model", "Prompt"] as const;

export function AgentForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("other");
  const [provider, setProvider] = useState("anthropic");
  const [modelId, setModelId] = useState("claude-sonnet-4-6");
  const [thinkingLevel, setThinkingLevel] = useState<AgentDoc["thinkingLevel"]>("off");
  const [systemPrompt, setSystemPrompt] = useState("");

  async function handleSubmit() {
    if (!user) return;
    setSaving(true);
    try {
      const agentId = await createAgent(user.uid, {
        name,
        description,
        domain,
        systemPrompt,
        modelProvider: provider,
        modelId,
        thinkingLevel,
        builtinTools: ["read", "bash"],
      });
      toast.success("Agent created");
      router.push(`/agents/${agentId}`);
    } catch {
      toast.error("Failed to create agent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => i <= step && setStep(i)}
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-xs font-medium">
              {i + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="basics"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Invoice Analyzer"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Analyzes invoices and extracts key financial data..."
              />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setStep(1)} disabled={!name.trim()}>
              Next
            </Button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="model"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <ModelSelector
              provider={provider}
              modelId={modelId}
              thinkingLevel={thinkingLevel}
              onProviderChange={setProvider}
              onModelChange={setModelId}
              onThinkingLevelChange={setThinkingLevel}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)}>Next</Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <SystemPromptEditor value={systemPrompt} onChange={setSystemPrompt} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
