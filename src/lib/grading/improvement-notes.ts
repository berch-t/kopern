import { streamLLM } from "@/lib/llm/client";
import { estimateTokens } from "@/lib/billing/pricing";
import { trackUsageServer } from "@/lib/billing/track-usage-server";

export interface ImprovementNote {
  category: "system_prompt" | "skill" | "tool" | "general";
  severity: "critical" | "suggestion";
  title: string;
  detail: string;
}

export interface ImprovementAnalysis {
  summary: string;
  notes: ImprovementNote[];
}

interface CaseResultForAnalysis {
  caseName: string;
  passed: boolean;
  score: number;
  expectedBehavior: string;
  agentOutput: string;
  criteriaResults: { criterionType: string; passed: boolean; score: number; message: string }[];
}

/**
 * Analyze grading results and generate improvement suggestions for the agent.
 * Called after a grading run completes.
 */
export async function generateImprovementNotes(
  agentSystemPrompt: string,
  finalScore: number,
  caseResults: CaseResultForAnalysis[],
  locale: string = "en",
  apiKey?: string,
  /** Pass userId + agentId to track token consumption for billing */
  userId?: string,
  agentId?: string,
): Promise<ImprovementAnalysis> {
  const isFr = locale === "fr";
  // If perfect score, no improvements needed
  if (finalScore >= 0.99) {
    return {
      summary: isFr
        ? "Excellente performance — tous les cas de test ont été réussis avec des scores élevés."
        : "Excellent performance — all test cases passed with high scores.",
      notes: [],
    };
  }

  // Build context from failed/low-score cases
  const failedCases = caseResults
    .filter((c) => !c.passed || c.score < 0.7)
    .map((c) => {
      const criteriaDetail = c.criteriaResults
        .map((cr) => `  - ${cr.criterionType}: ${cr.passed ? "PASS" : "FAIL"} (${cr.score}) — ${cr.message}`)
        .join("\n");
      return `### ${c.caseName} (score: ${Math.round(c.score * 100)}%)
Expected: ${c.expectedBehavior}
Agent output (first 500 chars): ${c.agentOutput.slice(0, 500)}
Criteria:
${criteriaDetail}`;
    })
    .join("\n\n");

  const passedCases = caseResults
    .filter((c) => c.passed && c.score >= 0.7)
    .map((c) => `- ${c.caseName}: ${Math.round(c.score * 100)}%`)
    .join("\n");

  const langInstruction = isFr
    ? `IMPORTANT: Rédige TOUT le contenu (summary, title, detail) en **français**.`
    : `Write all content (summary, title, detail) in **English**.`;

  const prompt = `You are an AI agent optimization expert. Analyze these grading results and suggest specific improvements to the agent's configuration.

${langInstruction}

## Agent System Prompt (current)
${agentSystemPrompt.slice(0, 2000)}

## Overall Score: ${Math.round(finalScore * 100)}%

## Failed / Low-Score Cases
${failedCases || "None"}

## Passed Cases
${passedCases || "None"}

## Your Task
Generate a JSON improvement analysis. For each issue found, suggest a SPECIFIC, ACTIONABLE improvement targeting one of:
- **system_prompt**: Changes to the agent's system prompt (add instructions, clarify behavior)
- **skill**: Suggest a new skill template (markdown document) to add to the agent
- **tool**: Suggest a tool improvement or new tool
- **general**: Other suggestions

Severity levels:
- **critical**: Directly caused a test failure
- **suggestion**: Would improve score but not strictly required

IMPORTANT:
- Be specific. Don't say "improve the prompt". Say exactly WHAT to add/change.
- Use **markdown formatting** in the "detail" field: use headers (###), bullet points, code blocks (\`\`\`), bold, etc. to make the content readable.
- Include concrete code snippets or exact text to add when suggesting prompt/skill changes.

Respond ONLY with valid JSON:
{
  "summary": "One paragraph overview in markdown format",
  "notes": [
    {
      "category": "system_prompt" | "skill" | "tool" | "general",
      "severity": "critical" | "suggestion",
      "title": "Short title",
      "detail": "Detailed markdown-formatted actionable instruction with code snippets where relevant"
    }
  ]
}`;

  try {
    let fullResponse = "";
    const improvementModel = "claude-sonnet-4-6";

    await new Promise<void>((resolve, reject) => {
      streamLLM(
        {
          provider: "anthropic",
          model: improvementModel,
          systemPrompt: "You are a strict JSON-only evaluator. Always respond with valid JSON only.",
          messages: [{ role: "user", content: prompt }],
          apiKey,
        },
        {
          onToken: (text: string) => {
            fullResponse += text;
          },
          onDone: () => resolve(),
          onError: (error: Error) => reject(error),
        }
      );
    });

    // Track improvement analysis token usage (fire-and-forget)
    if (userId && agentId) {
      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(fullResponse);
      trackUsageServer(userId, agentId, "anthropic", inputTokens, outputTokens, 0, improvementModel)
        .catch(() => {});
    }

    // Extract JSON from response
    const jsonMatch = fullResponse.match(/\{[\s\S]*"summary"[\s\S]*"notes"[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        summary: "Could not generate improvement analysis.",
        notes: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ImprovementAnalysis;

    // Validate structure
    if (!parsed.summary || !Array.isArray(parsed.notes)) {
      return { summary: parsed.summary || "Analysis incomplete.", notes: [] };
    }

    // Sanitize notes
    parsed.notes = parsed.notes
      .filter((n) => n.title && n.detail)
      .map((n) => ({
        category: ["system_prompt", "skill", "tool", "general"].includes(n.category) ? n.category : "general",
        severity: n.severity === "critical" ? "critical" : "suggestion",
        title: n.title,
        detail: n.detail,
      }));

    return parsed;
  } catch (err) {
    console.error("[GRADING] Improvement notes generation failed:", (err as Error).message);
    return {
      summary: "Improvement analysis could not be generated.",
      notes: [],
    };
  }
}
