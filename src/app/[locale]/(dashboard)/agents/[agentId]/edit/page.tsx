"use client";

import { use, useState, useEffect } from "react";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import {
  agentDoc,
  type AgentDoc,
  type PurposeGateConfig,
  type TillDoneConfig,
  type AgentBranding,
  type ToolOverrideConfig,
} from "@/lib/firebase/firestore";
import { updateAgent } from "@/actions/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ModelSelector } from "@/components/agents/ModelSelector";
import { SystemPromptEditor } from "@/components/agents/SystemPromptEditor";
import { PurposeGateConfig as PurposeGateEditor } from "@/components/agents/PurposeGateConfig";
import { TillDoneConfig as TillDoneEditor } from "@/components/agents/TillDoneConfig";
import { BrandingEditor } from "@/components/agents/BrandingEditor";
import { ToolOverrideEditor } from "@/components/agents/ToolOverrideEditor";
import { SlideUp } from "@/components/motion/SlideUp";
import { useDictionary } from "@/providers/LocaleProvider";
import { toast } from "sonner";

export default function EditAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const router = useLocalizedRouter();
  const t = useDictionary();
  const { data: agent, loading } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("");
  const [modelId, setModelId] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState<AgentDoc["thinkingLevel"]>("off");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [purposeGate, setPurposeGate] = useState<PurposeGateConfig | null>(null);
  const [tillDone, setTillDone] = useState<TillDoneConfig | null>(null);
  const [branding, setBranding] = useState<AgentBranding | null>(null);
  const [toolOverrides, setToolOverrides] = useState<ToolOverrideConfig[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description);
      setProvider(agent.modelProvider);
      setModelId(agent.modelId);
      setThinkingLevel(agent.thinkingLevel);
      setSystemPrompt(agent.systemPrompt);
      setPurposeGate(agent.purposeGate ?? null);
      setTillDone(agent.tillDone ?? null);
      setBranding(agent.branding ?? null);
      setToolOverrides(agent.toolOverrides ?? []);
    }
  }, [agent]);

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading...</div>;
  }

  if (!agent || !user) {
    return <div className="text-destructive">Agent not found</div>;
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateAgent(user.uid, agentId, {
        name,
        description,
        modelProvider: provider,
        modelId,
        thinkingLevel,
        systemPrompt,
        purposeGate,
        tillDone,
        branding,
        toolOverrides,
      });
      toast.success("Agent updated");
      router.push(`/agents/${agentId}`);
    } catch {
      toast.error("Failed to update agent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SlideUp>
        <h1 className="text-3xl font-bold">{t.agents.detail.editConfig}</h1>
      </SlideUp>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t.agents.form.name}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>{t.agents.form.description}</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <ModelSelector
          provider={provider}
          modelId={modelId}
          thinkingLevel={thinkingLevel}
          onProviderChange={setProvider}
          onModelChange={setModelId}
          onThinkingLevelChange={setThinkingLevel}
        />

        <SystemPromptEditor value={systemPrompt} onChange={setSystemPrompt} />

        <Separator />

        {/* Purpose Gate */}
        <PurposeGateEditor config={purposeGate} onChange={setPurposeGate} />

        {/* TillDone Mode */}
        <TillDoneEditor config={tillDone} onChange={setTillDone} />

        <Separator />

        {/* Agent Branding */}
        <BrandingEditor branding={branding} onChange={setBranding} />

        {/* Tool Overrides */}
        <ToolOverrideEditor overrides={toolOverrides} onChange={setToolOverrides} />

        <Separator />

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t.agents.form.saving : t.agents.form.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
