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
  type ToolApprovalPolicy,
  type RiskLevel,
} from "@/lib/firebase/firestore";
import { updateAgent } from "@/actions/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ModelSelector } from "@/components/agents/ModelSelector";
import { SystemPromptEditor } from "@/components/agents/SystemPromptEditor";
import { PurposeGateConfig as PurposeGateEditor } from "@/components/agents/PurposeGateConfig";
import { TillDoneConfig as TillDoneEditor } from "@/components/agents/TillDoneConfig";
import { BrandingEditor } from "@/components/agents/BrandingEditor";
import { ToolOverrideEditor } from "@/components/agents/ToolOverrideEditor";
import { SlideUp } from "@/components/motion/SlideUp";
import { useDictionary } from "@/providers/LocaleProvider";
import { toast } from "sonner";
import { FileDown } from "lucide-react";

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
  const [toolApprovalPolicy, setToolApprovalPolicy] = useState<ToolApprovalPolicy>("auto");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("minimal");
  const [auditLog, setAuditLog] = useState(false);
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
      setToolApprovalPolicy(agent.toolApprovalPolicy ?? "auto");
      setRiskLevel(agent.riskLevel ?? "minimal");
      setAuditLog(agent.auditLog ?? false);
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
        toolApprovalPolicy,
        riskLevel,
        auditLog,
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

        {/* EU AI Act — Risk Level */}
        <div className="space-y-2">
          <Label>{t.compliance?.riskLevel ?? "Risk Level (EU AI Act Art. 6)"}</Label>
          <Select value={riskLevel} onValueChange={(v) => {
            setRiskLevel(v as RiskLevel);
            // Auto-enable auditLog for limited/high
            if (v === "limited" || v === "high") setAuditLog(true);
            // Auto-set approval policy for high-risk
            if (v === "high" && toolApprovalPolicy === "auto") setToolApprovalPolicy("confirm_destructive");
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">{t.compliance?.riskMinimal ?? "Minimal Risk"}</SelectItem>
              <SelectItem value="limited">{t.compliance?.riskLimited ?? "Limited Risk"}</SelectItem>
              <SelectItem value="high">{t.compliance?.riskHigh ?? "High Risk"}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t.compliance?.riskDescription ?? "Classify your agent per EU AI Act risk categories. High-risk agents require tool approval and audit logging."}
          </p>
        </div>

        {/* Audit Log */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t.compliance?.auditLog ?? "Audit Trail (Art. 12)"}</Label>
            <p className="text-xs text-muted-foreground">
              {t.compliance?.auditLogDesc ?? "Log all tool calls and session events for compliance. Required for limited/high risk agents."}
            </p>
          </div>
          <Switch
            checked={auditLog}
            onCheckedChange={setAuditLog}
            disabled={riskLevel === "limited" || riskLevel === "high"}
          />
        </div>

        {/* Tool Approval Policy */}
        <div className="space-y-2">
          <Label>{t.approval?.policyLabel ?? "Tool Approval Policy"}<span className="text-[10px] text-muted-foreground ml-1">(Art. 14)</span></Label>
          <Select value={toolApprovalPolicy} onValueChange={(v) => setToolApprovalPolicy(v as ToolApprovalPolicy)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t.approval?.policyAuto ?? "Automatic (no confirmation)"}</SelectItem>
              <SelectItem value="confirm_destructive">{t.approval?.policyDestructive ?? "Confirm destructive actions"}</SelectItem>
              <SelectItem value="confirm_all">{t.approval?.policyAll ?? "Confirm all tool calls"}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t.approval?.policyDescription ?? "Controls whether tool calls require human approval before execution."}
          </p>
        </div>

        <Separator />

        {/* Compliance Report Download */}
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (!user) return;
            try {
              const token = await user.getIdToken();
              const res = await fetch(`/api/agents/${agentId}/compliance-report`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) throw new Error("Failed to generate report");
              const report = await res.json();
              const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `compliance-report-${agentId}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(t.compliance?.reportDownloaded ?? "Compliance report downloaded");
            } catch {
              toast.error(t.compliance?.reportError ?? "Failed to generate compliance report");
            }
          }}
        >
          <FileDown className="h-4 w-4 mr-2" />
          {t.compliance?.downloadReport ?? "Download Compliance Report (Art. 11)"}
        </Button>

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
