import { type CriterionEvaluator, type CriterionResult } from "../types";
import { type CollectedEvents } from "@/lib/pi-mono/event-collector";
import { streamLLM } from "@/lib/llm/client";

interface LlmJudgeConfig {
  judgeProvider: string;
  judgeModel: string;
  rubric: string;
  scoreThreshold: number;
}

const DEFAULT_PROVIDER = "anthropic";
const DEFAULT_MODEL = "claude-sonnet-4-6";

export const llmJudgeEvaluator: CriterionEvaluator = {
  type: "llm_judge",

  async evaluate(config: Record<string, unknown>, events: CollectedEvents): Promise<CriterionResult> {
    const c = config as unknown as LlmJudgeConfig & { _locale?: string; _apiKey?: string };
    const provider = c.judgeProvider || DEFAULT_PROVIDER;
    const model = c.judgeModel || DEFAULT_MODEL;
    const threshold = c.scoreThreshold ?? 0.7;
    const locale = (config._locale as string) || "en";
    const langInstruction = locale === "fr"
      ? "IMPORTANT: Rédige le champ 'reasoning' en français."
      : "";

    const userPrompt = `You are an evaluation judge. Score the following agent output on a scale of 0.0 to 1.0 based on this rubric:

Rubric: ${c.rubric}

Agent Output:
${events.assistantOutput}

Tool Calls Made:
${events.toolCalls.map((tc) => `- ${tc.name}(${JSON.stringify(tc.args)}) → ${tc.result}`).join("\n")}

${langInstruction}
Respond ONLY with valid JSON in this exact format, no other text:
{ "score": <number between 0.0 and 1.0>, "reasoning": "<explanation>" }`;

    try {
      let fullResponse = "";

      await new Promise<void>((resolve, reject) => {
        streamLLM(
          {
            provider,
            model,
            systemPrompt: "You are a strict evaluation judge. Always respond with valid JSON only.",
            messages: [{ role: "user", content: userPrompt }],
            apiKey: c._apiKey,
          },
          {
            onToken: (text: string) => {
              fullResponse += text;
            },
            onDone: () => {
              resolve();
            },
            onError: (error: Error) => {
              reject(error);
            },
          }
        );
      });

      // Extract JSON from response (handle markdown code blocks or surrounding text)
      const jsonMatch = fullResponse.match(/\{[\s\S]*?"score"[\s\S]*?"reasoning"[\s\S]*?\}/);
      if (!jsonMatch) {
        return {
          criterionId: "",
          criterionType: "llm_judge",
          passed: false,
          score: 0,
          message: `LLM Judge (${provider}/${model}) returned unparseable response. Raw output: ${fullResponse.slice(0, 500)}`,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]) as { score: number; reasoning: string };

      if (typeof parsed.score !== "number" || parsed.score < 0 || parsed.score > 1) {
        return {
          criterionId: "",
          criterionType: "llm_judge",
          passed: false,
          score: 0,
          message: `LLM Judge (${provider}/${model}) returned invalid score: ${parsed.score}. Must be between 0.0 and 1.0.`,
        };
      }

      const passed = parsed.score >= threshold;

      return {
        criterionId: "",
        criterionType: "llm_judge",
        passed,
        score: parsed.score,
        message: `LLM Judge (${provider}/${model}) — score: ${parsed.score}/${threshold} threshold${passed ? " (PASSED)" : " (FAILED)"}. ${parsed.reasoning}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        criterionId: "",
        criterionType: "llm_judge",
        passed: false,
        score: 0,
        message: `LLM Judge (${provider}/${model}) failed: ${errorMessage}`,
      };
    }
  },
};
