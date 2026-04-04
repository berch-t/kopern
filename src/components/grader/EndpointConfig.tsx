"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useDictionary } from "@/providers/LocaleProvider";

export interface EndpointConfigData {
  url: string;
  method: "POST" | "GET";
  authType: "none" | "bearer" | "api_key_header" | "api_key_query";
  authValue: string;
  authHeaderName: string;
  bodyTemplate: string;
  responsePath: string;
}

interface EndpointConfigProps {
  config: EndpointConfigData;
  onChange: (config: EndpointConfigData) => void;
}

interface ProbeResult {
  success: boolean;
  statusCode: number;
  responseBody: string;
  detectedPath: string;
  detectedFormat: string;
  latencyMs: number;
  error?: string;
}

interface PresetDef {
  name: string;
  labelKey: "presetOpenai" | "presetAnthropic" | "presetSimple" | "presetN8n" | "presetCustom";
  bodyTemplate: string;
  responsePath: string;
}

const PRESETS: PresetDef[] = [
  {
    name: "openai",
    labelKey: "presetOpenai",
    bodyTemplate: '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "{{input}}"}]}',
    responsePath: "choices[0].message.content",
  },
  {
    name: "anthropic",
    labelKey: "presetAnthropic",
    bodyTemplate: '{"model": "claude-sonnet-4-20250514", "max_tokens": 1024, "messages": [{"role": "user", "content": "{{input}}"}]}',
    responsePath: "content[0].text",
  },
  {
    name: "simple",
    labelKey: "presetSimple",
    bodyTemplate: '{"message": "{{input}}"}',
    responsePath: "",
  },
  {
    name: "n8n",
    labelKey: "presetN8n",
    bodyTemplate: '{"message": "{{input}}"}',
    responsePath: "output",
  },
  {
    name: "custom",
    labelKey: "presetCustom",
    bodyTemplate: '{"message": "{{input}}"}',
    responsePath: "",
  },
];

export function EndpointConfig({ config, onChange }: EndpointConfigProps) {
  const t = useDictionary();
  const g = t.grader;

  const [activePreset, setActivePreset] = useState<string>("simple");
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [showAuth, setShowAuth] = useState(config.authType !== "none");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (partial: Partial<EndpointConfigData>) => {
    onChange({ ...config, ...partial });
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESETS.find((p) => p.name === presetName);
    if (preset) {
      setActivePreset(presetName);
      update({
        bodyTemplate: preset.bodyTemplate,
        responsePath: preset.responsePath,
      });
    }
  };

  const probe = async () => {
    if (!config.url) return;
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await fetch("/api/grader/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: config.url,
          method: config.method,
          authType: config.authType,
          authValue: config.authValue || undefined,
          authHeaderName: config.authHeaderName || undefined,
          bodyTemplate: config.bodyTemplate,
        }),
      });
      const result: ProbeResult = await res.json();
      setProbeResult(result);

      if (result.success && result.detectedPath && !config.responsePath) {
        update({ responsePath: result.detectedPath });
      }
    } catch {
      setProbeResult({ success: false, statusCode: 0, responseBody: "", detectedPath: "", detectedFormat: "", latencyMs: 0, error: "Network error" });
    } finally {
      setProbing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* URL + Method */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">{g.endpointUrl}</label>
        <div className="flex gap-2">
          <select
            value={config.method}
            onChange={(e) => update({ method: e.target.value as "POST" | "GET" })}
            className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
          <input
            type="url"
            value={config.url}
            onChange={(e) => update({ url: e.target.value })}
            placeholder={g.endpointUrlPlaceholder}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={probe}
            disabled={probing || !config.url}
            className="whitespace-nowrap"
          >
            {probing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            {probing ? g.probing : g.probe}
          </Button>
        </div>
      </div>

      {/* Probe result */}
      {probeResult && (
        <div className={`rounded-lg border px-3 py-2.5 text-sm ${probeResult.success ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <div className="flex items-center gap-2">
            {probeResult.success
              ? <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              : <XCircle className="h-4 w-4 text-red-400 shrink-0" />
            }
            <span className={probeResult.success ? "text-emerald-300" : "text-red-300"}>
              {probeResult.success
                ? `${g.probeConnected} (${probeResult.latencyMs}ms) — ${g.probeFormat}: ${probeResult.detectedFormat}`
                : `${g.probeFailed}: ${probeResult.error || `HTTP ${probeResult.statusCode}`}`
              }
            </span>
          </div>
          {probeResult.success && probeResult.detectedPath && (
            <div className="text-xs text-muted-foreground mt-1">
              {g.probeAutoDetected}: <code className="text-accent">{probeResult.detectedPath}</code>
            </div>
          )}
        </div>
      )}

      {/* Preset selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">{g.apiFormat}</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.name)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                activePreset === preset.name
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {g[preset.labelKey]}
            </button>
          ))}
        </div>
      </div>

      {/* Auth section */}
      <div>
        <button
          onClick={() => setShowAuth(!showAuth)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {showAuth ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {g.authentication}
          {config.authType !== "none" && <span className="text-xs text-emerald-400 ml-1">({g.authConfigured})</span>}
        </button>
        {showAuth && (
          <div className="mt-2 space-y-2 pl-5 border-l border-border">
            <select
              value={config.authType}
              onChange={(e) => update({ authType: e.target.value as EndpointConfigData["authType"] })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="none">{g.authNone}</option>
              <option value="bearer">{g.authBearer}</option>
              <option value="api_key_header">{g.authApiKeyHeader}</option>
              <option value="api_key_query">{g.authApiKeyQuery}</option>
            </select>
            {config.authType !== "none" && (
              <>
                {(config.authType === "api_key_header" || config.authType === "api_key_query") && (
                  <input
                    type="text"
                    value={config.authHeaderName}
                    onChange={(e) => update({ authHeaderName: e.target.value })}
                    placeholder={config.authType === "api_key_header" ? g.authHeaderPlaceholder : g.authQueryPlaceholder}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                  />
                )}
                <input
                  type="password"
                  value={config.authValue}
                  onChange={(e) => update({ authValue: e.target.value })}
                  placeholder={config.authType === "bearer" ? g.authBearerPlaceholder : g.authKeyPlaceholder}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  {g.authDisclaimer}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Advanced: body template + response path */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {g.advancedConfig}
        </button>
        {showAdvanced && (
          <div className="mt-2 space-y-3 pl-5 border-l border-border">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {g.bodyTemplate}
                <span className="text-accent ml-1">{"{{input}}"}</span>
                <span className="text-muted-foreground ml-1">{g.bodyTemplatePlaceholder}</span>
              </label>
              <textarea
                value={config.bodyTemplate}
                onChange={(e) => update({ bodyTemplate: e.target.value })}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {g.responsePath}
              </label>
              <input
                type="text"
                value={config.responsePath}
                onChange={(e) => update({ responsePath: e.target.value })}
                placeholder={g.responsePathPlaceholder}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
