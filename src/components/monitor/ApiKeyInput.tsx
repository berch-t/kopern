"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Eye, EyeOff } from "lucide-react";
import { MONITOR_PROVIDERS, PROVIDER_IDS } from "@/lib/monitor/models";
import { useDictionary } from "@/providers/LocaleProvider";

interface ApiKeyInputProps {
  onSubmit: (provider: string, model: string, apiKey: string) => void;
  disabled?: boolean;
}

export function ApiKeyInput({ onSubmit, disabled }: ApiKeyInputProps) {
  const t = useDictionary();
  const m = t.monitor;
  const [provider, setProvider] = useState(PROVIDER_IDS[0]);
  const [model, setModel] = useState(MONITOR_PROVIDERS[PROVIDER_IDS[0]].models[0].id);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const providerConfig = MONITOR_PROVIDERS[provider];

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    const first = MONITOR_PROVIDERS[newProvider].models[0];
    if (first) setModel(first.id);
  }

  function handleSubmit() {
    if (!apiKey.trim()) return;
    onSubmit(provider, model, apiKey.trim());
  }

  return (
    <div className="space-y-4">
      {/* Provider tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {PROVIDER_IDS.map((pid) => (
          <button
            key={pid}
            onClick={() => handleProviderChange(pid)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              provider === pid
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {MONITOR_PROVIDERS[pid].name}
          </button>
        ))}
      </div>

      {/* Model selector */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">{m.selectModel}</label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providerConfig.models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* API key input */}
      <div>
        <label className="text-sm font-medium mb-1.5 block">{m.apiKey}</label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={providerConfig.placeholder}
            className="pr-10 font-mono text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Security disclaimer */}
      <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 p-3">
        <Shield className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          {m.securityDisclaimer}
        </p>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={disabled || !apiKey.trim()}
        className="w-full"
        size="lg"
      >
        {m.runDiagnostic}
      </Button>
    </div>
  );
}
