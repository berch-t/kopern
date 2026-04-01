"use client";

import { useState, useEffect } from "react";
import type { Node } from "@xyflow/react";
import type { AgentDoc, AgentRole } from "@/lib/firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";
import { AgentConfigDialog } from "./AgentConfigDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NodeEditDialogProps {
  node: Node | null;
  agents: (AgentDoc & { id: string })[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (nodeId: string, data: Record<string, unknown>) => void;
}

const AGENT_ROLES: { value: AgentRole; label: string }[] = [
  { value: "coordinator", label: "Coordinateur" },
  { value: "specialist", label: "Spécialiste" },
  { value: "reviewer", label: "Reviewer" },
  { value: "researcher", label: "Chercheur" },
  { value: "communicator", label: "Communicateur" },
  { value: "custom", label: "Custom" },
];

const TRIGGER_TYPES = [
  { value: "manual", label: "Manuel" },
  { value: "cron", label: "Planifié (Cron)" },
  { value: "webhook", label: "Webhook" },
] as const;

const AGGREGATION_MODES = [
  { value: "concat", label: "Concat (tous les résultats)" },
  { value: "last", label: "Dernier résultat" },
  { value: "best", label: "Meilleur résultat" },
] as const;

// ---------------------------------------------------------------------------
// Agent node form
// ---------------------------------------------------------------------------

function AgentForm({
  data,
  agents,
  onChange,
  onEditAgent,
}: {
  data: Record<string, unknown>;
  agents: (AgentDoc & { id: string })[];
  onChange: (d: Record<string, unknown>) => void;
  onEditAgent: (agentId: string) => void;
}) {
  const agentId = (data.agentId as string) || "";
  const role = (data.role as string) || "";
  const roleType = (data.roleType as AgentRole) || "specialist";
  const description = (data.description as string) || "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Agent</Label>
        <div className="flex gap-2">
          <Select
            value={agentId}
            onValueChange={(v) => {
              const agent = agents.find((a) => a.id === v);
              onChange({
                ...data,
                agentId: v,
                label: agent?.name || data.label,
                branding: agent?.branding ?? null,
              });
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Sélectionner un agent..." />
            </SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {agentId && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEditAgent(agentId)}
              title="Éditer la config de l'agent"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          value={roleType}
          onValueChange={(v) =>
            onChange({ ...data, roleType: v as AgentRole, role: AGENT_ROLES.find((r) => r.value === v)?.label || v })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AGENT_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Nom du role</Label>
        <Input
          value={role}
          onChange={(e) => onChange({ ...data, role: e.target.value })}
          placeholder="Ex: Analyste SEO"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Que fait cet agent dans l'équipe ?"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Condition node form
// ---------------------------------------------------------------------------

function ConditionForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const label = (data.label as string) || "";
  const condition = (data.condition as string) || "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom</Label>
        <Input
          value={label}
          onChange={(e) => onChange({ ...data, label: e.target.value })}
          placeholder="Ex: Router, Classifier..."
        />
      </div>

      <div className="space-y-2">
        <Label>Condition</Label>
        <Input
          value={condition}
          onChange={(e) => onChange({ ...data, condition: e.target.value })}
          placeholder="Ex: Si le message concerne le support..."
        />
        <p className="text-[11px] text-muted-foreground">
          Décrivez la logique de routage. Les sorties sont : True (droite), False (gauche), Default (bas).
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trigger node form
// ---------------------------------------------------------------------------

function TriggerForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const label = (data.label as string) || "";
  const triggerType = (data.triggerType as string) || "manual";
  const cronExpression = (data.cronExpression as string) || "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom</Label>
        <Input
          value={label}
          onChange={(e) => onChange({ ...data, label: e.target.value })}
          placeholder="Ex: Start, Déclencheur..."
        />
      </div>

      <div className="space-y-2">
        <Label>Type de déclencheur</Label>
        <Select
          value={triggerType}
          onValueChange={(v) => onChange({ ...data, triggerType: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {triggerType === "cron" && (
        <div className="space-y-2">
          <Label>Expression Cron</Label>
          <Input
            value={cronExpression}
            onChange={(e) => onChange({ ...data, cronExpression: e.target.value })}
            placeholder="Ex: 0 9 * * 1-5"
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Format: minute heure jour-mois mois jour-semaine
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Output node form
// ---------------------------------------------------------------------------

function OutputForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const label = (data.label as string) || "";
  const aggregation = (data.aggregation as string) || "concat";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom</Label>
        <Input
          value={label}
          onChange={(e) => onChange({ ...data, label: e.target.value })}
          placeholder="Ex: Résultat final, Rapport..."
        />
      </div>

      <div className="space-y-2">
        <Label>Mode d'agrégation</Label>
        <Select
          value={aggregation}
          onValueChange={(v) => onChange({ ...data, aggregation: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AGGREGATION_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export node form
// ---------------------------------------------------------------------------

const EXPORT_FORMATS = [
  { value: "json", label: "JSON" },
  { value: "csv", label: "CSV" },
  { value: "markdown", label: "Markdown" },
  { value: "pdf", label: "PDF" },
] as const;

function ExportForm({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const label = (data.label as string) || "";
  const exportFormat = (data.exportFormat as string) || "json";
  const autoDownload = (data.autoDownload as boolean) ?? true;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom</Label>
        <Input
          value={label}
          onChange={(e) => onChange({ ...data, label: e.target.value })}
          placeholder="Ex: Export rapport, Télécharger..."
        />
      </div>

      <div className="space-y-2">
        <Label>Format d'export</Label>
        <Select
          value={exportFormat}
          onValueChange={(v) => onChange({ ...data, exportFormat: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPORT_FORMATS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Téléchargement automatique</Label>
          <p className="text-[11px] text-muted-foreground">
            Lancer le téléchargement dès la fin du run.
          </p>
        </div>
        <Switch
          checked={autoDownload}
          onCheckedChange={(v) => onChange({ ...data, autoDownload: v })}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog title per node type
// ---------------------------------------------------------------------------

const NODE_TITLES: Record<string, string> = {
  agent: "Configurer l'agent",
  condition: "Configurer la condition",
  trigger: "Configurer le déclencheur",
  output: "Configurer la sortie",
  export: "Configurer l'export",
};

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export function NodeEditDialog({
  node,
  agents,
  open,
  onOpenChange,
  onSave,
}: NodeEditDialogProps) {
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [configAgentId, setConfigAgentId] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  useEffect(() => {
    if (node) {
      setEditData({ ...node.data } as Record<string, unknown>);
    }
  }, [node]);

  if (!node) return null;

  const nodeType = node.type || "agent";

  function handleSave() {
    onSave(node!.id, editData);
    onOpenChange(false);
  }

  function handleEditAgent(agentId: string) {
    setConfigAgentId(agentId);
    setConfigDialogOpen(true);
  }

  function handleAgentSaved() {
    // After agent config is saved, refresh the branding in the node data
    const agentId = editData.agentId as string;
    if (agentId) {
      const agent = agents.find((a) => a.id === agentId);
      if (agent) {
        setEditData((prev) => ({
          ...prev,
          label: agent.name,
          branding: agent.branding ?? null,
        }));
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{NODE_TITLES[nodeType] || "Configurer le node"}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Double-cliquez sur un node pour le configurer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {nodeType === "agent" && (
              <AgentForm
                data={editData}
                agents={agents}
                onChange={setEditData}
                onEditAgent={handleEditAgent}
              />
            )}
            {nodeType === "condition" && (
              <ConditionForm data={editData} onChange={setEditData} />
            )}
            {nodeType === "trigger" && (
              <TriggerForm data={editData} onChange={setEditData} />
            )}
            {nodeType === "output" && (
              <OutputForm data={editData} onChange={setEditData} />
            )}
            {nodeType === "export" && (
              <ExportForm data={editData} onChange={setEditData} />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AgentConfigDialog
        agentId={configAgentId}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSaved={handleAgentSaved}
      />
    </>
  );
}
