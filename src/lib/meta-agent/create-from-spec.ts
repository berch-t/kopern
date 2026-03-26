import { createAgent, updateAgent } from "@/actions/agents";
import { createSkill } from "@/actions/skills";
import { createTool } from "@/actions/tools";
import { createExtension } from "@/actions/extensions";
import { createGradingSuite } from "@/actions/grading-suites";
import { createGradingCase } from "@/actions/grading-cases";
import { buildCriterionConfig } from "@/lib/grading/build-criterion-config";
import type { AgentSpec } from "./types";

/**
 * Create a full Kopern agent from a parsed AgentSpec.
 * Shared between MetaAgentWizard (dashboard) and WelcomeWizard (onboarding).
 *
 * Creates: agent + skills + tools + extensions + grading suite + cases.
 * Returns the new agentId.
 */
export async function createAgentFromSpec(
  userId: string,
  spec: AgentSpec,
  descriptionOverride?: string
): Promise<string> {
  const agentName = spec.name || "New Agent";
  const agentDomain = spec.domain || "other";
  const agentPrompt = spec.systemPrompt;

  const modelProvider = spec.modelProvider || "anthropic";
  const modelId = spec.modelId || "claude-sonnet-4-6";
  const thinkingLevel = (spec.thinkingLevel || "off") as
    | "off"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | "xhigh";
  const builtinTools = spec.builtinTools?.length ? spec.builtinTools : [];

  const agentId = await createAgent(userId, {
    name: agentName,
    description: descriptionOverride ?? spec.rawSpec.slice(0, 200),
    domain: agentDomain,
    systemPrompt: agentPrompt,
    modelProvider,
    modelId,
    thinkingLevel,
    builtinTools,
  });

  // Apply purpose gate, tillDone, branding if present
  const updates: Record<string, unknown> = {};
  if (spec.purposeGate) updates.purposeGate = spec.purposeGate;
  if (spec.tillDone) updates.tillDone = spec.tillDone;
  if (spec.branding) updates.branding = spec.branding;
  if (Object.keys(updates).length > 0) {
    await updateAgent(
      userId,
      agentId,
      updates as Parameters<typeof updateAgent>[2]
    );
  }

  // Create skills
  if (spec.skills?.length) {
    await Promise.all(
      spec.skills.map((s) =>
        createSkill(userId, agentId, {
          name: s.name,
          description: s.name,
          content: s.content,
        })
      )
    );
  }

  // Create tools
  if (spec.tools?.length) {
    await Promise.all(
      spec.tools.map((t) =>
        createTool(userId, agentId, {
          name: t.name,
          label: t.name,
          description: t.description,
          parametersSchema: t.parametersSchema,
          executeCode: t.executeCode,
        })
      )
    );
  }

  // Create extensions
  if (spec.extensions?.length) {
    await Promise.all(
      spec.extensions.map((ext) =>
        createExtension(userId, agentId, {
          name: ext.name,
          description: ext.description,
          code: ext.code,
          events: ext.events ?? [],
          blocking: ext.blocking ?? false,
        })
      )
    );
  }

  // Create grading suite + cases
  if (spec.gradingCases?.length) {
    const suiteId = await createGradingSuite(userId, agentId, {
      name: `Suite de tests — ${agentName}`,
      description: `Tests de qualité pour ${agentName} (${agentDomain})`,
    });
    await Promise.all(
      spec.gradingCases.map((c, i) =>
        createGradingCase(userId, agentId, suiteId, {
          name: c.name,
          inputPrompt: c.input,
          expectedBehavior: c.expected,
          orderIndex: i,
          criteria: [
            {
              id: crypto.randomUUID(),
              type: c.criterionType as
                | "output_match"
                | "schema_validation"
                | "tool_usage"
                | "safety_check"
                | "custom_script"
                | "llm_judge",
              name: c.name,
              config: buildCriterionConfig(c.criterionType, c.expected),
              weight: 1,
            },
          ],
        })
      )
    );
  }

  return agentId;
}
