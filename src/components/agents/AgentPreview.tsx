"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronUp,
  Cpu,
  Key,
  MessageSquare,
  Rocket,
  Settings2,
  Wrench,
  BookOpen,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { hydratePrompt, extractAgentName } from "@/lib/templates/hydrate";
import type { VerticalTemplate } from "@/data/vertical-templates";

const channelLabels: Record<string, { label: string; labelFr: string }> = {
  whatsapp: { label: "WhatsApp", labelFr: "WhatsApp" },
  widget: { label: "Website Widget", labelFr: "Widget Site Web" },
  slack: { label: "Slack", labelFr: "Slack" },
  telegram: { label: "Telegram", labelFr: "Telegram" },
};

interface AgentPreviewProps {
  template: VerticalTemplate;
  answers: Record<string, string>;
  locale: string;
  onDeploy: () => void;
  deploying: boolean;
  hasApiKey?: boolean;
}

export function AgentPreview({
  template,
  answers,
  locale,
  onDeploy,
  deploying,
  hasApiKey = true,
}: AgentPreviewProps) {
  const isFr = locale === "fr";
  const [promptExpanded, setPromptExpanded] = useState(false);

  const agentName = useMemo(
    () => extractAgentName(template, answers, locale),
    [template, answers, locale]
  );

  const systemPrompt = useMemo(
    () => hydratePrompt(template.systemPromptTemplate, answers),
    [template, answers]
  );

  const channel = channelLabels[template.suggestedChannel];

  return (
    <div className="space-y-6">
      {/* ── Agent identity ──────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("rounded-lg p-2.5", `bg-${template.color}-500/10`)}>
              <template.icon className={cn("h-7 w-7", `text-${template.color}-500`)} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{agentName}</h2>
              <p className="text-sm text-muted-foreground">
                {isFr ? template.verticalFr : template.vertical}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat
              icon={Cpu}
              label={isFr ? "Modèle" : "Model"}
              value={template.modelId.split("-").slice(-2).join(" ")}
            />
            <MiniStat
              icon={Wrench}
              label="Tools"
              value={String(template.tools.length)}
            />
            <MiniStat
              icon={BookOpen}
              label="Skills"
              value={String(template.skills.length)}
            />
            <MiniStat
              icon={MessageSquare}
              label={isFr ? "Canal" : "Channel"}
              value={isFr ? channel?.labelFr : channel?.label}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── System prompt ──────────────────────── */}
      <Card>
        <CardHeader
          className="cursor-pointer flex flex-row items-center justify-between py-3 px-5"
          onClick={() => setPromptExpanded(!promptExpanded)}
        >
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            {isFr ? "Prompt système généré" : "Generated System Prompt"}
          </CardTitle>
          {promptExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        {promptExpanded && (
          <CardContent className="px-5 pb-5 pt-0">
            <ScrollArea className="h-64 rounded-md border p-3">
              <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                {systemPrompt}
              </pre>
            </ScrollArea>
          </CardContent>
        )}
      </Card>

      {/* ── Tools list ──────────────────────── */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tools ({template.tools.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0 space-y-2">
          {template.tools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="text-sm font-mono">{tool.name}</span>
              <span className="text-xs text-muted-foreground max-w-[50%] truncate">
                {tool.description}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Grading test cases ──────────────────────── */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            {isFr ? "Tests de qualité" : "Quality Tests"} ({template.gradingSuite.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <p className="text-xs text-muted-foreground mb-2">
            {isFr
              ? "Ces scénarios seront créés automatiquement pour valider votre agent."
              : "These scenarios will be created automatically to validate your agent."}
          </p>
          <div className="space-y-1">
            {template.gradingSuite.slice(0, 5).map((tc) => (
              <div key={tc.caseName} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                {tc.caseName}
              </div>
            ))}
            {template.gradingSuite.length > 5 && (
              <p className="text-xs text-muted-foreground pl-3.5">
                +{template.gradingSuite.length - 5} {isFr ? "autres" : "more"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── API key warning ──────────────────────── */}
      {!hasApiKey && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Key className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                {isFr
                  ? `Clé API ${template.modelProvider} requise`
                  : `${template.modelProvider} API key required`}
              </p>
              <p className="text-muted-foreground mt-0.5">
                {isFr
                  ? "L'agent sera créé, mais vous devrez ajouter votre clé API dans Paramètres avant de pouvoir l'utiliser."
                  : "The agent will be created, but you'll need to add your API key in Settings before you can use it."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Deploy button ──────────────────────── */}
      <Button
        size="lg"
        className="w-full text-base"
        onClick={onDeploy}
        disabled={deploying}
      >
        {deploying ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            {isFr ? "Création en cours..." : "Creating..."}
          </>
        ) : (
          <>
            <Rocket className="h-5 w-5 mr-2" />
            {isFr ? "Déployer mon agent" : "Deploy my Agent"}
          </>
        )}
      </Button>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-md border px-3 py-2 text-center">
      <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value ?? "—"}</p>
    </div>
  );
}
