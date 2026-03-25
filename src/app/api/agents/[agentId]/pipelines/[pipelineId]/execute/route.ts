import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { resolveProviderKey, resolveProviderKeys } from "@/lib/llm/resolve-key";
import { pipelineExecuteSchema, validateBody } from "@/lib/security/validation";
import { checkRateLimit, chatRateLimit } from "@/lib/security/rate-limit";

interface PipelineStepConfig {
  agentId: string;
  agentName: string;
  role: string;
  order: number;
  inputMapping: "previous_output" | "original_input" | "custom";
  customInputTemplate?: string;
  continueOnError: boolean;
  systemPrompt: string;
  modelProvider: string;
  modelId: string;
  skills?: { name: string; content: string }[];
}

interface PipelineExecuteBody {
  prompt: string;
  userId: string;
  pipelineName: string;
  steps: PipelineStepConfig[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; pipelineId: string }> }
) {
  const { pipelineId } = await params;
  const raw = await request.json();
  const parsed = validateBody(pipelineExecuteSchema, raw);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data as PipelineExecuteBody;
  const { prompt, userId, pipelineName, steps } = body;

  // Rate limit
  const rl = await checkRateLimit(chatRateLimit, `pipeline:${userId}`);
  if (rl) return rl;

  // Enforce plan: pipelines require Pro+
  if (userId) {
    const planCheck = await checkPlanLimits(userId, "pipelines");
    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: planCheck.reason, plan: planCheck.plan },
        { status: 403 }
      );
    }
    const tokenCheck = await checkPlanLimits(userId, "tokens");
    if (!tokenCheck.allowed) {
      return NextResponse.json(
        { error: tokenCheck.reason, plan: tokenCheck.plan },
        { status: 403 }
      );
    }
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
      const totalSteps = sortedSteps.length;

      send("pipeline_start", { pipelineId, pipelineName, totalSteps });

      let previousOutput = "";
      const allResults: { stepIndex: number; agentName: string; role: string; result: string; status: "completed" | "failed" }[] = [];

      for (let i = 0; i < sortedSteps.length; i++) {
        const step = sortedSteps[i];
        send("step_start", {
          stepIndex: i,
          totalSteps,
          agentId: step.agentId,
          agentName: step.agentName,
          role: step.role,
        });

        // Build input based on mapping
        let stepInput: string;
        switch (step.inputMapping) {
          case "previous_output":
            stepInput = previousOutput || prompt;
            break;
          case "original_input":
            stepInput = prompt;
            break;
          case "custom":
            stepInput = (step.customInputTemplate ?? "{{original_input}}")
              .replace(/\{\{previous_output\}\}/g, previousOutput)
              .replace(/\{\{original_input\}\}/g, prompt);
            break;
          default:
            stepInput = previousOutput || prompt;
        }

        // Build system prompt
        let systemPrompt = step.systemPrompt || "";
        systemPrompt += `\n\n<pipeline-context>\nYou are step ${i + 1} of ${totalSteps} in pipeline "${pipelineName}".\nYour role: ${step.role}\n</pipeline-context>`;

        if (step.skills && step.skills.length > 0) {
          const skillsXml = step.skills
            .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
            .join("\n\n");
          systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
        }

        let stepResult = "";
        let stepFailed = false;

        // Resolve API key(s) per step's provider
        const apiKeys = userId ? await resolveProviderKeys(userId, step.modelProvider) : [];
        const apiKey = apiKeys[0];

        try {
          await runAgentWithTools(
            {
              provider: step.modelProvider,
              model: step.modelId,
              systemPrompt,
              messages: [{ role: "user", content: stepInput }],
              userId,
              agentId: step.agentId,
              apiKey,
              apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
              skipOutboundWebhooks: true,
            },
            {
              onToken: (text) => {
                stepResult += text;
                send("step_token", { stepIndex: i, agentId: step.agentId, text });
              },
              onToolStart: (tc) => {
                send("step_tool_start", { stepIndex: i, agentId: step.agentId, name: tc.name, args: tc.args });
              },
              onToolEnd: (r) => {
                send("step_tool_end", { stepIndex: i, agentId: step.agentId, name: r.name, result: r.result, isError: r.isError });
              },
              onDone: (metrics) => {
                send("step_done", {
                  stepIndex: i,
                  agentId: step.agentId,
                  agentName: step.agentName,
                  result: stepResult,
                  metrics,
                });
              },
              onError: (error) => {
                stepFailed = true;
                send("step_error", {
                  stepIndex: i,
                  agentId: step.agentId,
                  message: error.message,
                });
              },
            }
          );
        } catch (err) {
          stepFailed = true;
          send("step_error", {
            stepIndex: i,
            agentId: step.agentId,
            message: (err as Error).message,
          });
        }

        allResults.push({
          stepIndex: i,
          agentName: step.agentName,
          role: step.role,
          result: stepResult,
          status: stepFailed ? "failed" : "completed",
        });

        if (stepFailed && !step.continueOnError) {
          send("pipeline_abort", {
            pipelineId,
            failedStep: i,
            reason: "Step failed and continueOnError is false",
          });
          break;
        }

        previousOutput = stepResult;
      }

      send("pipeline_done", { pipelineId, pipelineName, results: allResults });
      close();
    } catch (err) {
      send("error", { message: (err as Error).message });
      close();
    }
  })();

  return sseResponse(stream);
}
