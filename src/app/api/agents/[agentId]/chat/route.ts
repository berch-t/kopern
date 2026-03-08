import { NextRequest } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";
import { estimateTokens, calculateTokenCost } from "@/lib/billing/pricing";

interface ChatRequestBody {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  agentConfig: {
    systemPrompt: string;
    modelProvider: string;
    modelId: string;
    skills?: { name: string; content: string }[];
    purpose?: string | null;
    tillDoneEnabled?: boolean;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = (await request.json()) as ChatRequestBody;
  const { message, history, agentConfig } = body;

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      // Build system prompt with skills
      let systemPrompt = agentConfig.systemPrompt || "";
      if (agentConfig.skills && agentConfig.skills.length > 0) {
        const skillsXml = agentConfig.skills
          .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
          .join("\n\n");
        systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
      }

      // Inject session purpose into system prompt (Purpose Gate)
      if (agentConfig.purpose) {
        systemPrompt += `\n\n<session-purpose>\n${agentConfig.purpose}\n</session-purpose>`;
      }

      // Inject TillDone instructions if enabled
      if (agentConfig.tillDoneEnabled) {
        systemPrompt += `\n\n<till-done-mode>
You MUST maintain a task list for this session. Before executing any action:
1. Create a task describing what you plan to do
2. Update the task status to "in_progress" when starting
3. Mark it "done" when complete
4. Do NOT finish until all tasks are marked done

Use the task_management tool to manage your tasks. If tasks remain incomplete, continue working on them.
</till-done-mode>`;
      }

      // Build message history
      const messages: LLMMessage[] = [
        ...history.map((m) => ({ role: m.role, content: m.content } as LLMMessage)),
        { role: "user" as const, content: message },
      ];

      // Track token usage for observability
      const inputText = systemPrompt + messages.map((m) => m.content).join(" ");
      const estimatedInputTokens = estimateTokens(inputText);
      let outputTokenCount = 0;

      send("status", { status: "thinking" });
      send("metrics", {
        estimatedInputTokens,
        provider: agentConfig.modelProvider,
      });

      await streamLLM(
        {
          provider: agentConfig.modelProvider,
          model: agentConfig.modelId,
          systemPrompt,
          messages,
        },
        {
          onToken: (text) => {
            outputTokenCount += estimateTokens(text);
            send("token", { text });
          },
          onDone: () => {
            const cost = calculateTokenCost(
              agentConfig.modelProvider,
              estimatedInputTokens,
              outputTokenCount
            );
            send("done", {
              agentId,
              metrics: {
                inputTokens: estimatedInputTokens,
                outputTokens: outputTokenCount,
                estimatedCost: cost,
              },
            });
            close();
          },
          onError: (error) => {
            send("error", { message: error.message });
            close();
          },
        }
      );
    } catch (err) {
      send("error", { message: (err as Error).message });
      close();
    }
  })();

  return sseResponse(stream);
}
