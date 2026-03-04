import { NextRequest } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = await request.json();
  const {
    message,
    history,
    agentConfig,
  } = body as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    agentConfig: {
      systemPrompt: string;
      modelProvider: string;
      modelId: string;
      skills?: { name: string; content: string }[];
    };
  };

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

      // Build message history
      const messages: LLMMessage[] = [
        ...history.map((m) => ({ role: m.role, content: m.content } as LLMMessage)),
        { role: "user" as const, content: message },
      ];

      send("status", { status: "thinking" });

      await streamLLM(
        {
          provider: agentConfig.modelProvider,
          model: agentConfig.modelId,
          systemPrompt,
          messages,
        },
        {
          onToken: (text) => {
            send("token", { text });
          },
          onDone: () => {
            send("done", { agentId });
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
