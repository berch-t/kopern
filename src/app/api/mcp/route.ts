import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveApiKey } from "@/lib/mcp/auth";
import { countTokens, trackUsage } from "@/lib/mcp/token-counter";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id: number | string;
}

function jsonRpcError(id: number | string | null, code: number, message: string) {
  return NextResponse.json({
    jsonrpc: "2.0",
    error: { code, message },
    id,
  }, { status: code === -32600 ? 400 : code === -32601 ? 400 : 200 });
}

export async function POST(request: NextRequest) {
  // 1. Extract Bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "Missing API key" }, id: null },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);

  // 2. Resolve API key
  const resolved = await resolveApiKey(apiKey);
  if (!resolved) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "Invalid API key" }, id: null },
      { status: 401 }
    );
  }

  if (!resolved.enabled) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "API key is disabled" }, id: null },
      { status: 403 }
    );
  }

  // 3. Parse JSON-RPC body
  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (body.jsonrpc !== "2.0" || !body.method) {
    return jsonRpcError(body.id ?? null, -32600, "Invalid JSON-RPC request");
  }

  // 4. Enforce plan limits
  const tokenCheck = await checkPlanLimits(resolved.userId, "tokens");
  if (!tokenCheck.allowed) {
    return jsonRpcError(body?.id ?? null, -32000, tokenCheck.reason || "Plan limit reached");
  }

  // 5. Load agent doc
  const agentSnap = await adminDb
    .collection("users")
    .doc(resolved.userId)
    .collection("agents")
    .doc(resolved.agentId)
    .get();

  if (!agentSnap.exists) {
    return jsonRpcError(body.id, -32000, "Agent not found");
  }

  const agent = agentSnap.data()!;

  // 5. Route by method
  switch (body.method) {
    case "initialize": {
      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          name: agent.name,
          description: agent.description,
          model: { provider: agent.modelProvider, id: agent.modelId },
        },
        id: body.id,
      });
    }

    case "completion/create": {
      const message = (body.params?.message as string) || "";
      if (!message) {
        return jsonRpcError(body.id, -32602, "params.message is required");
      }

      // Build system prompt with skills
      let systemPrompt = agent.systemPrompt || "";
      const skillsSnap = await adminDb
        .collection("users")
        .doc(resolved.userId)
        .collection("agents")
        .doc(resolved.agentId)
        .collection("skills")
        .get();

      if (!skillsSnap.empty) {
        const skillsXml = skillsSnap.docs
          .map((d) => {
            const s = d.data();
            return `<skill name="${s.name}">\n${s.content}\n</skill>`;
          })
          .join("\n\n");
        systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
      }

      // Build messages (support optional history in params)
      const history = (body.params?.history as { role: string; content: string }[]) || [];
      const messages: LLMMessage[] = [
        ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: message },
      ];

      // Count input tokens
      const inputText = systemPrompt + messages.map((m) => m.content).join("");
      const inputTokens = countTokens(inputText);

      // Call LLM and collect full response
      let fullResponse = "";

      try {
        await new Promise<void>((resolve, reject) => {
          streamLLM(
            {
              provider: agent.modelProvider,
              model: agent.modelId,
              systemPrompt,
              messages,
            },
            {
              onToken: (text) => {
                fullResponse += text;
              },
              onDone: () => resolve(),
              onError: (err) => reject(err),
            }
          );
        });
      } catch (err) {
        return jsonRpcError(body.id, -32000, `LLM error: ${(err as Error).message}`);
      }

      // Count output tokens
      const outputTokens = countTokens(fullResponse);

      // Track usage
      await trackUsage(
        resolved.userId,
        resolved.agentId,
        resolved.mcpServerId,
        inputTokens,
        outputTokens
      );

      return NextResponse.json({
        jsonrpc: "2.0",
        result: {
          content: fullResponse,
          usage: { inputTokens, outputTokens },
        },
        id: body.id,
      });
    }

    default:
      return jsonRpcError(body.id, -32601, `Unknown method: ${body.method}`);
  }
}
