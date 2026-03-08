import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";
import { META_AGENT_SYSTEM_PROMPT } from "@/data/meta-agent-template";

interface MetaCreateBody {
  description: string;
  modelProvider: string;
  modelId: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as MetaCreateBody;
  const { description, modelProvider, modelId } = body;

  if (!description || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Description must be at least 10 characters" },
      { status: 400 }
    );
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      send("status", { status: "analyzing" });

      const messages: LLMMessage[] = [
        {
          role: "user",
          content: `Create a complete agent specification for the following request:\n\n${description}\n\nProvide the full specification in the structured format described in your instructions. Be specific and production-ready.`,
        },
      ];

      let fullResponse = "";

      await streamLLM(
        {
          provider: modelProvider || "anthropic",
          model: modelId || "claude-sonnet-4-6",
          systemPrompt: META_AGENT_SYSTEM_PROMPT,
          messages,
        },
        {
          onToken: (text) => {
            fullResponse += text;
            send("token", { text });
          },
          onDone: () => {
            // Parse the response to extract agent specification
            const spec = parseAgentSpec(fullResponse);
            send("spec", spec);
            send("done", { success: true });
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

function parseAgentSpec(response: string): Record<string, unknown> {
  // Extract sections from the structured response
  const nameMatch = response.match(/###?\s*Agent Name:\s*(.+)/i);
  const domainMatch = response.match(/###?\s*Domain:\s*(.+)/i);
  const promptMatch = response.match(/###?\s*System Prompt:\s*\n([\s\S]*?)(?=###|$)/i);

  // Extract skills
  const skills: { name: string; content: string }[] = [];
  const skillRegex = /\*\*(.+?)\*\*:\s*([\s\S]*?)(?=\n\*\*|\n###|$)/g;
  const skillsSection = response.match(/###?\s*Skills:\s*\n([\s\S]*?)(?=###|$)/i);
  if (skillsSection) {
    let match;
    while ((match = skillRegex.exec(skillsSection[1])) !== null) {
      skills.push({ name: match[1].trim(), content: match[2].trim() });
    }
  }

  return {
    name: nameMatch?.[1]?.trim() ?? "New Agent",
    domain: domainMatch?.[1]?.trim() ?? "General",
    systemPrompt: promptMatch?.[1]?.trim() ?? response.slice(0, 500),
    skills,
    rawSpec: response,
  };
}
