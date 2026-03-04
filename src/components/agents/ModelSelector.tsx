"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { providers, getProviderModels, thinkingLevels, getModelInfo } from "@/lib/pi-mono/providers";
import type { AgentDoc } from "@/lib/firebase/firestore";

interface ModelSelectorProps {
  provider: string;
  modelId: string;
  thinkingLevel: AgentDoc["thinkingLevel"];
  onProviderChange: (provider: string) => void;
  onModelChange: (modelId: string) => void;
  onThinkingLevelChange: (level: AgentDoc["thinkingLevel"]) => void;
}

export function ModelSelector({
  provider,
  modelId,
  thinkingLevel,
  onProviderChange,
  onModelChange,
  onThinkingLevelChange,
}: ModelSelectorProps) {
  const models = getProviderModels(provider);
  const currentModel = getModelInfo(provider, modelId);
  const supportsThinking = currentModel?.supportsThinking ?? false;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select value={provider} onValueChange={(v) => {
          onProviderChange(v);
          const firstModel = getProviderModels(v)[0];
          if (firstModel) onModelChange(firstModel.id);
        }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Select value={modelId} onValueChange={onModelChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Thinking Level</Label>
        <Select
          value={thinkingLevel}
          onValueChange={(v) => onThinkingLevelChange(v as AgentDoc["thinkingLevel"])}
          disabled={!supportsThinking}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {thinkingLevels.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
