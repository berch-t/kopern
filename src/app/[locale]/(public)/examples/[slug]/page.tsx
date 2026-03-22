"use client";

import { use, useMemo } from "react";
import { useLocalizedUseCases } from "@/hooks/useLocalizedUseCases";
import type { UseCase } from "@/data/use-cases";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  Shield,
  Copy,
  Check,
  Rocket,
} from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { createAgent } from "@/actions/agents";
import { createSkill } from "@/actions/skills";
import { createTool } from "@/actions/tools";

function generateToolStub(name: string, description: string, params: string): string {
  return `// ${description}
// Parameters: ${params}

async function execute(params) {
  // This tool was auto-generated from the "${name}" example template.
  // Connect it to your data source or API to make it functional.

  const result = {
    status: "success",
    tool: "${name}",
    message: "Tool executed with provided parameters",
    params: params,
  };

  return JSON.stringify(result, null, 2);
}

return execute(params);`;
}

function CopyBlock({ content, label }: { content: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  }, [content, label]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      Copy
    </button>
  );
}

function buildMarkdown(uc: UseCase): string {
  let md = "";

  md += `## System Prompt\n\n\`\`\`text\n${uc.systemPrompt}\n\`\`\`\n\n`;

  md += `## Skills\n\n`;
  for (const skill of uc.skills) {
    md += `### ${skill.name}\n\n\`\`\`xml\n${skill.content}\n\`\`\`\n\n`;
  }

  md += `## Tools\n\n`;
  for (const tool of uc.tools) {
    md += `### ${tool.name}\n\n`;
    md += `**Description:** ${tool.description}\n\n`;
    md += `**Parameters:**\n\`\`\`json\n${tool.params}\n\`\`\`\n\n`;
  }

  md += `## MCP Integration\n\n\`\`\`text\n${uc.mcpIntegration}\n\`\`\`\n\n`;

  md += `## Grading Suite\n\n`;
  for (const gc of uc.gradingSuite) {
    md += `### ${gc.caseName}\n\n`;
    md += `**Input:**\n\`\`\`text\n${gc.input}\n\`\`\`\n\n`;
    md += `**Criteria:**\n\`\`\`text\n${gc.criteria}\n\`\`\`\n\n`;
  }

  return md;
}

export default function ExampleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useLocalizedRouter();
  const { user } = useAuth();
  const t = useDictionary();
  const [creating, setCreating] = useState(false);
  const localizedCases = useLocalizedUseCases();
  const uc = localizedCases.find((u) => u.slug === slug);

  const handleUseAgent = useCallback(async () => {
    if (!uc) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setCreating(true);
    try {
      const agentId = await createAgent(user.uid, {
        name: uc.title,
        description: uc.tagline,
        domain: uc.domain,
        systemPrompt: uc.systemPrompt,
        modelProvider: "anthropic",
        modelId: "claude-sonnet-4-6",
        thinkingLevel: "off",
        builtinTools: [],
      });
      await Promise.all(
        uc.skills.map((s) =>
          createSkill(user.uid, agentId, {
            name: s.name,
            description: `Skill from ${uc.title}`,
            content: s.content,
          })
        )
      );
      await Promise.all(
        uc.tools.map((tool) =>
          createTool(user.uid, agentId, {
            name: tool.name,
            label: tool.name,
            description: tool.description,
            parametersSchema: tool.params,
            executeCode: tool.executeCode || generateToolStub(tool.name, tool.description, tool.params),
          })
        )
      );
      toast.success(t.examples.agentCreated);
      router.push(`/agents/${agentId}`);
    } catch {
      toast.error(t.examples.agentCreateFailed);
    } finally {
      setCreating(false);
    }
  }, [user, uc, router, t]);
  const markdown = useMemo(() => (uc ? buildMarkdown(uc) : ""), [uc]);
  const fullMarkdown = useMemo(() => {
    if (!uc) return "";
    return `# ${uc.title}\n\n> ${uc.tagline}\n\n${markdown}`;
  }, [uc, markdown]);

  if (!uc) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">{t.examples.exampleNotFound}</p>
        <Button variant="outline" onClick={() => router.push("/examples")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.examples.backToExamples}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <SlideUp>
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => router.push("/examples")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.examples.allExamples}
        </Button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <uc.icon className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{uc.title}</h1>
              <Badge variant="secondary">{uc.domain}</Badge>
            </div>
            <p className="text-muted-foreground">{uc.tagline}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleUseAgent}
              disabled={creating}
              className="gap-2"
            >
              <Rocket className="h-4 w-4" />
              {creating ? t.examples.creating : t.examples.useThisAgent}
            </Button>
            <CopyBlock content={fullMarkdown} label={t.examples.copyFull} />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm leading-7 text-foreground/90 mb-8">
          {uc.description}
        </p>

        {/* ROI Metrics */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          <div className="flex items-start gap-3 rounded-lg border bg-green-500/5 p-4">
            <Clock className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                {t.examples.timeSaved}
              </p>
              <p className="text-sm font-semibold">{uc.timeSaved}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-blue-500/5 p-4">
            <DollarSign className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                {t.examples.costReduction}
              </p>
              <p className="text-sm font-semibold">{uc.costReduction}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border bg-orange-500/5 p-4">
            <Shield className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
                {t.examples.riskMitigation}
              </p>
              <p className="text-sm font-semibold">{uc.riskMitigation}</p>
            </div>
          </div>
        </div>
      </SlideUp>

      {/* Full configuration */}
      <FadeIn>
        <article className="pb-24">
          <MarkdownRenderer content={markdown} headingIds />
        </article>
      </FadeIn>
    </div>
  );
}
