import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveApiKey } from "@/lib/mcp/auth";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { trackUsage } from "@/lib/mcp/token-counter";
import { logAppError } from "@/lib/errors/logger";
import { resolveProviderKey, resolveProviderKeys } from "@/lib/llm/resolve-key";
import { runAgentWithTools, type AgentRunMetrics } from "@/lib/tools/run-agent";
import type { LLMMessage } from "@/lib/llm/client";
import { createSessionServer, updateSessionMetrics, appendSessionEvents, endSessionServer } from "@/lib/billing/track-usage-server";
import { calculateTokenCost } from "@/lib/billing/pricing";
import { checkRateLimit, mcpRateLimit } from "@/lib/security/rate-limit";

// ─── MCP Protocol Types ──────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id?: number | string | null;
}

function jsonOk(id: number | string | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", result, id });
}

function jsonErr(id: number | string | null, code: number, message: string, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", error: { code, message }, id },
    { status }
  );
}

// ─── Auth helper ─────────────────────────────────────────────────────

async function authenticate(request: NextRequest) {
  // Try Bearer header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return resolveApiKey(authHeader.slice(7));
  }
  // Fallback: query param ?key=kpn_...
  const keyParam = new URL(request.url).searchParams.get("key");
  if (keyParam) {
    return resolveApiKey(keyParam);
  }
  return null;
}

// ─── Agent loader ────────────────────────────────────────────────────

async function loadAgent(userId: string, agentId: string) {
  const snap = await adminDb
    .collection("users")
    .doc(userId)
    .collection("agents")
    .doc(agentId)
    .get();
  return snap.exists ? snap.data()! : null;
}

async function loadSkills(userId: string, agentId: string) {
  const snap = await adminDb
    .collection("users")
    .doc(userId)
    .collection("agents")
    .doc(agentId)
    .collection("skills")
    .get();
  return snap.docs.map((d) => d.data());
}

// ─── Tool definitions ────────────────────────────────────────────────

function buildToolList(agent: Record<string, unknown>) {
  return [
    {
      name: "kopern_chat",
      description: `Send a message to the "${agent.name}" agent and get a response. The agent may use its internal tools (GitHub, code analysis, etc.) to answer.`,
      inputSchema: {
        type: "object" as const,
        properties: {
          message: {
            type: "string",
            description: "The message to send to the agent",
          },
          history: {
            type: "array",
            description: "Optional conversation history for multi-turn chats",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["user", "assistant"] },
                content: { type: "string" },
              },
              required: ["role", "content"],
            },
          },
        },
        required: ["message"],
      },
    },
    {
      name: "kopern_agent_info",
      description: "Get metadata about this agent (name, description, model, configuration).",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
  ];
}

// ─── Tool execution ──────────────────────────────────────────────────

async function executeChat(
  userId: string,
  agentId: string,
  mcpServerId: string,
  agent: Record<string, unknown>,
  skills: Record<string, unknown>[],
  params: Record<string, unknown>
) {
  const message = params.message as string;
  if (!message) return { isError: true, content: [{ type: "text", text: "message is required" }] };

  // Build system prompt with skills
  let systemPrompt = (agent.systemPrompt as string) || "";
  if (skills.length > 0) {
    const xml = skills.map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`).join("\n\n");
    systemPrompt += `\n\n<skills>\n${xml}\n</skills>`;
  }

  // Build messages
  const history = (params.history as { role: string; content: string }[]) || [];
  const messages: LLMMessage[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  // Resolve API key(s) from user Firestore settings
  const mcpProvider = agent.modelProvider as string;
  const apiKeys = await resolveProviderKeys(userId, mcpProvider);
  const apiKey = apiKeys[0];

  // Create session for MCP tracking
  let sessionId = "";
  try {
    sessionId = await createSessionServer(userId, agentId, {
      purpose: message.slice(0, 120),
      modelUsed: agent.modelId as string,
      providerUsed: agent.modelProvider as string,
      source: "mcp",
    });
  } catch { /* continue without session */ }

  // Use the full agentic loop with tools (GitHub, Slack, custom, bug management)
  let fullResponse = "";
  const toolCalls: { name: string; args: Record<string, unknown>; result: string; isError: boolean }[] = [];
  const toolEvents: { type: string; data: Record<string, unknown> }[] = [];

  try {
    const metrics = await new Promise<AgentRunMetrics>((resolve, reject) => {
      runAgentWithTools(
        {
          provider: agent.modelProvider as string,
          model: agent.modelId as string,
          systemPrompt,
          messages,
          userId,
          agentId,
          connectedRepos: (agent.connectedRepos as string[]) || [],
          apiKey,
          apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
          skipOutboundWebhooks: true, // CRITICAL: anti-loop protection
          toolApprovalPolicy: (agent.toolApprovalPolicy as "auto" | "confirm_destructive" | "confirm_all") || "auto",
          riskLevel: (agent.riskLevel as "minimal" | "limited" | "high") || "minimal",
        },
        {
          onToken: (text) => { fullResponse += text; },
          onToolStart: (tc) => {
            toolCalls.push({ name: tc.name, args: tc.args, result: "", isError: false });
            toolEvents.push({ type: "tool_call", data: { name: tc.name, args: tc.args } });
          },
          onToolEnd: (result) => {
            const last = toolCalls.find((t) => t.name === result.name && !t.result);
            if (last) {
              last.result = result.result;
              last.isError = result.isError;
            }
            toolEvents.push({ type: "tool_result", data: { name: result.name, result: result.result, isError: result.isError } });
          },
          onDone: (m) => resolve(m),
          onError: (err) => reject(err),
        }
      );
    });

    // Track MCP-specific usage (per-server breakdown)
    trackUsage(userId, agentId, mcpServerId, metrics.inputTokens, metrics.outputTokens).catch((err) =>
      logAppError({ code: "MCP_USAGE_TRACK_FAILED", message: (err as Error).message, source: "mcp", userId, agentId })
    );

    // Persist session (fire-and-forget)
    if (sessionId) {
      const cost = calculateTokenCost(agent.modelProvider as string, metrics.inputTokens, metrics.outputTokens, agent.modelId as string);
      const events = [
        { type: "message", data: { role: "user", content: message } },
        ...toolEvents,
        { type: "message", data: { role: "assistant", content: fullResponse.slice(0, 10000) } },
      ];
      appendSessionEvents(userId, agentId, sessionId, events).catch((err) => logAppError({ code: "SESSION_EVENT_WRITE_FAILED", message: (err as Error).message, source: "mcp", userId, agentId }));
      updateSessionMetrics(userId, agentId, sessionId, {
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        cost,
        toolCallCount: metrics.toolCallCount,
        messageCount: 2,
      }).catch((err) => logAppError({ code: "SESSION_METRICS_WRITE_FAILED", message: (err as Error).message, source: "mcp", userId, agentId }));
      endSessionServer(userId, agentId, sessionId).catch((err) => logAppError({ code: "SESSION_END_FAILED", message: (err as Error).message, source: "mcp", userId, agentId }));
    }

    // Build response with tool call summary if any tools were used
    let responseText = fullResponse;
    if (toolCalls.length > 0) {
      const toolSummary = toolCalls
        .map((tc) => `[Tool: ${tc.name}${tc.isError ? " (error)" : ""}]`)
        .join(", ");
      responseText += `\n\n---\n_Tools used: ${toolSummary} | ${metrics.toolCallCount} calls across ${metrics.toolIterations} iterations_`;
    }

    return {
      content: [{ type: "text", text: responseText }],
    };
  } catch (err) {
    if (sessionId) endSessionServer(userId, agentId, sessionId).catch(() => {});
    return { isError: true, content: [{ type: "text", text: `Agent error: ${(err as Error).message}` }] };
  }
}

// ─── POST handler (MCP Streamable HTTP) ──────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const resolved = await authenticate(request);
  if (!resolved) {
    return jsonErr(null, -32000, "Missing or invalid API key", 401);
  }
  if (!resolved.enabled) {
    return jsonErr(null, -32000, "API key is disabled", 403);
  }

  // Rate limiting by API key
  const rl = await checkRateLimit(mcpRateLimit, resolved.agentId);
  if (rl) return rl;

  // 2. Parse body
  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return jsonErr(null, -32700, "Parse error", 400);
  }

  // Notifications (no id) → acknowledge with 202
  if (body.id === undefined || body.id === null) {
    // notifications/initialized, etc. — no response needed
    return new NextResponse(null, { status: 202 });
  }

  if (body.jsonrpc !== "2.0" || !body.method) {
    return jsonErr(body.id, -32600, "Invalid JSON-RPC request", 400);
  }

  // 3. Route by method
  switch (body.method) {
    // ── Initialize handshake ──
    case "initialize": {
      return jsonOk(body.id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "kopern",
          version: "1.0.0",
        },
      });
    }

    // ── Ping ──
    case "ping": {
      return jsonOk(body.id, {});
    }

    // ── List tools ──
    case "tools/list": {
      const agent = await loadAgent(resolved.userId, resolved.agentId);
      if (!agent) return jsonErr(body.id, -32000, "Agent not found");

      return jsonOk(body.id, {
        tools: buildToolList(agent),
      });
    }

    // ── Call a tool ──
    case "tools/call": {
      const toolName = body.params?.name as string;
      const toolArgs = (body.params?.arguments as Record<string, unknown>) || {};

      // Plan limits
      const tokenCheck = await checkPlanLimits(resolved.userId, "tokens");
      if (!tokenCheck.allowed) {
        return jsonOk(body.id, {
          isError: true,
          content: [{ type: "text", text: tokenCheck.reason || "Plan limit reached" }],
        });
      }

      const agent = await loadAgent(resolved.userId, resolved.agentId);
      if (!agent) return jsonErr(body.id, -32000, "Agent not found");

      switch (toolName) {
        case "kopern_chat": {
          const skills = await loadSkills(resolved.userId, resolved.agentId);
          const result = await executeChat(
            resolved.userId,
            resolved.agentId,
            resolved.mcpServerId,
            agent,
            skills,
            toolArgs
          );
          return jsonOk(body.id, result);
        }

        case "kopern_agent_info": {
          return jsonOk(body.id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    name: agent.name,
                    description: agent.description,
                    model: { provider: agent.modelProvider, id: agent.modelId },
                    domain: agent.domain || null,
                    purposeGate: agent.purposeGate || null,
                    connectedRepos: agent.connectedRepos || [],
                  },
                  null,
                  2
                ),
              },
            ],
          });
        }

        default:
          return jsonOk(body.id, {
            isError: true,
            content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
          });
      }
    }

    default:
      return jsonErr(body.id, -32601, `Unknown method: ${body.method}`);
  }
}

// ─── GET handler (required by MCP spec for SSE, returns 405 since we use Streamable HTTP) ──

export async function GET() {
  return NextResponse.json(
    { error: "Use POST for MCP Streamable HTTP protocol" },
    { status: 405 }
  );
}
