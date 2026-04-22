"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModelSelector } from "@/components/agents/ModelSelector";
import { SystemPromptEditor } from "@/components/agents/SystemPromptEditor";
import { PurposeGateConfig as PurposeGateEditor } from "@/components/agents/PurposeGateConfig";
import { TillDoneConfig as TillDoneEditor } from "@/components/agents/TillDoneConfig";
import { BrandingEditor } from "@/components/agents/BrandingEditor";
import { ToolOverrideEditor } from "@/components/agents/ToolOverrideEditor";
import { toast } from "sonner";

interface AgentConfigDialogProps {
  agentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save so the parent can refresh data */
  onSaved?: () => void;
}

export function AgentConfigDialog({
  agentId,
  open,
  onOpenChange,
  onSaved,
}: AgentConfigDialogProps) {
  const { user } = useAuth();
  const { data: agent, loading } = useDocument<AgentDoc>(
    user && agentId ? agentDoc(user.uid, agentId) : null
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

  // Sync form state when agent data loads
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

  async function handleSave() {
    if (!user || !agentId) return;
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
      toast.success("Agent mis à jour");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            {agent ? `Modifier — ${agent.name}` : "Modifier l&apos;agent"}
          </DialogTitle>
          <DialogDescription>
            Modifiez la configuration de l&apos;agent sans quitter la vue équipe.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : !agent ? (
              <p className="text-muted-foreground">Agent introuvable.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
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

                <PurposeGateEditor config={purposeGate} onChange={setPurposeGate} />
                <TillDoneEditor config={tillDone} onChange={setTillDone} />

                <Separator />

                <BrandingEditor branding={branding} onChange={setBranding} />
                <ToolOverrideEditor overrides={toolOverrides} onChange={setToolOverrides} />

                {/* Risk Level */}
                <div className="space-y-2">
                  <Label>Niveau de risque (EU AI Act Art. 6)</Label>
                  <Select value={riskLevel} onValueChange={(v) => {
                    setRiskLevel(v as RiskLevel);
                    if (v === "limited" || v === "high") setAuditLog(true);
                    if (v === "high" && toolApprovalPolicy === "auto") setToolApprovalPolicy("confirm_destructive");
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Risque minimal</SelectItem>
                      <SelectItem value="limited">Risque limité</SelectItem>
                      <SelectItem value="high">Risque élevé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Audit Log */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Journal d&apos;audit (Art. 12)</Label>
                    <p className="text-xs text-muted-foreground">
                      Requis pour les agents à risque limité/élevé.
                    </p>
                  </div>
                  <Switch
                    checked={auditLog}
                    onCheckedChange={setAuditLog}
                    disabled={riskLevel === "limited" || riskLevel === "high"}
                  />
                </div>

                {/* Tool Approval */}
                <div className="space-y-2">
                  <Label>Politique d&apos;approbation des tools (Art. 14)</Label>
                  <Select value={toolApprovalPolicy} onValueChange={(v) => setToolApprovalPolicy(v as ToolApprovalPolicy)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatique</SelectItem>
                      <SelectItem value="confirm_destructive">Confirmer les actions destructives</SelectItem>
                      <SelectItem value="confirm_all">Confirmer tous les appels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex justify-end gap-2 pt-2 pb-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
