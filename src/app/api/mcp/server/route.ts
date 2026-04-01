import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveApiKey, resolveUserApiKey, type ResolvedKey, type ResolvedUserKey } from "@/lib/mcp/auth";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { trackUsage } from "@/lib/mcp/token-counter";
import { logAppError } from "@/lib/errors/logger";
import { resolveProviderKey, resolveProviderKeys } from "@/lib/llm/resolve-key";
import { runAgentWithTools, type AgentRunMetrics } from "@/lib/tools/run-agent";
import type { LLMMessage } from "@/lib/llm/client";
import { createSessionServer, updateSessionMetrics, appendSessionEvents, endSessionServer } from "@/lib/billing/track-usage-server";
import { calculateTokenCost } from "@/lib/billing/pricing";
import { checkRateLimit, mcpRateLimit } from "@/lib/security/rate-limit";
import { runGradingSuite } from "@/lib/grading/runner";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import type { CriterionConfig } from "@/lib/firebase/firestore";
import { useCases } from "@/data/use-cases";
import { verticalTemplates } from "@/data/vertical-templates";

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

type AuthResult =
  | { type: "agent"; key: ResolvedKey }
  | { type: "user"; key: ResolvedUserKey }
  | null;

async function authenticate(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");
  const plainKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : new URL(request.url).searchParams.get("key");

  if (!plainKey) return null;

  // Try agent-bound key first (existing behavior)
  const agentKey = await resolveApiKey(plainKey);
  if (agentKey) return { type: "agent", key: agentKey };

  // Fallback: try user-level key
  const userKey = await resolveUserApiKey(plainKey);
  if (userKey) return { type: "user", key: userKey };

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
    {
      name: "kopern_list_templates",
      description: "List all available AI agent templates (28 general + 9 vertical/business). Returns slug, title, domain, tagline for each. No LLM cost.",
      inputSchema: {
        type: "object" as const,
        properties: {
          category: {
            type: "string",
            enum: ["all", "general", "vertical"],
            description: "Filter templates by category. Default: all",
          },
        },
      },
    },
    {
      name: "kopern_grade_prompt",
      description: "Grade an AI agent system prompt against test cases. Runs the agent with each test input and evaluates using 6 criteria types (output_match, schema_validation, tool_usage, safety_check, custom_script, llm_judge). Returns a score 0-1 per case and overall. Uses YOUR API keys for LLM calls.",
      inputSchema: {
        type: "object" as const,
        properties: {
          system_prompt: {
            type: "string",
            description: "The system prompt to evaluate",
          },
          test_cases: {
            type: "array",
            description: "Test cases to run. Each has an input prompt and expected behavior.",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Test case name" },
                input: { type: "string", description: "User message to send to the agent" },
                expected: { type: "string", description: "Expected behavior description (used for llm_judge evaluation)" },
              },
              required: ["name", "input", "expected"],
            },
          },
          provider: {
            type: "string",
            enum: ["anthropic", "openai", "google", "mistral"],
            description: "LLM provider to use. Default: anthropic",
          },
          model: {
            type: "string",
            description: "Model ID (e.g. claude-sonnet-4-5-20250514, gpt-4o). Default: provider's default model",
          },
        },
        required: ["system_prompt", "test_cases"],
      },
    },
    {
      name: "kopern_list_agents",
      description: "List all your Kopern agents (name, description, model, domain, latest grading score). No LLM cost.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
  ];
}

/** Tools available with a user-level key (no agent needed) */
function buildPlatformToolList() {
  return [
    {
      name: "kopern_list_templates",
      description: "List all available AI agent templates (28 general + 9 vertical/business). Returns slug, title, domain, tagline for each. No LLM cost.",
      inputSchema: {
        type: "object" as const,
        properties: {
          category: {
            type: "string",
            enum: ["all", "general", "vertical"],
            description: "Filter templates by category. Default: all",
          },
        },
      },
    },
    {
      name: "kopern_grade_prompt",
      description: "Grade an AI agent system prompt against test cases. Runs the agent with each test input and evaluates using 6 criteria types (output_match, schema_validation, tool_usage, safety_check, custom_script, llm_judge). Returns a score 0-1 per case and overall. Uses YOUR API keys for LLM calls.",
      inputSchema: {
        type: "object" as const,
        properties: {
          system_prompt: {
            type: "string",
            description: "The system prompt to evaluate",
          },
          test_cases: {
            type: "array",
            description: "Test cases to run. Each has an input prompt and expected behavior.",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Test case name" },
                input: { type: "string", description: "User message to send to the agent" },
                expected: { type: "string", description: "Expected behavior description (used for llm_judge evaluation)" },
              },
              required: ["name", "input", "expected"],
            },
          },
          provider: {
            type: "string",
            enum: ["anthropic", "openai", "google", "mistral"],
            description: "LLM provider to use. Default: anthropic",
          },
          model: {
            type: "string",
            description: "Model ID (e.g. claude-sonnet-4-5-20250514, gpt-4o). Default: provider's default model",
          },
        },
        required: ["system_prompt", "test_cases"],
      },
    },
    {
      name: "kopern_list_agents",
      description: "List all your Kopern agents (name, description, model, domain, latest grading score). No LLM cost.",
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

// ─── List templates ─────────────────────────────────────────────────

function executeListTemplates(params: Record<string, unknown>) {
  const category = (params.category as string) || "all";

  const general = useCases.map((t) => ({
    slug: t.slug,
    title: t.title,
    domain: t.domain,
    tagline: t.tagline,
    category: "general" as const,
  }));

  const vertical = verticalTemplates.map((t) => ({
    slug: t.slug,
    title: t.title,
    domain: t.vertical,
    tagline: t.tagline,
    category: "vertical" as const,
  }));

  const templates =
    category === "general" ? general :
    category === "vertical" ? vertical :
    [...general, ...vertical];

  return {
    content: [{
      type: "text",
      text: JSON.stringify({ count: templates.length, templates }, null, 2),
    }],
  };
}

// ─── Grade a prompt ─────────────────────────────────────────────────

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  google: "gemini-2.5-flash",
  mistral: "mistral-large-latest",
};

async function executeGradePrompt(
  userId: string,
  agentId: string,
  params: Record<string, unknown>
) {
  const systemPrompt = params.system_prompt as string;
  const testCases = params.test_cases as { name: string; input: string; expected: string }[];
  const provider = (params.provider as string) || "anthropic";
  const model = (params.model as string) || DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic;

  if (!systemPrompt) return { isError: true, content: [{ type: "text", text: "system_prompt is required" }] };
  if (!testCases?.length) return { isError: true, content: [{ type: "text", text: "test_cases must be a non-empty array" }] };
  if (testCases.length > 20) return { isError: true, content: [{ type: "text", text: "Maximum 20 test cases per run" }] };

  // Resolve user's API keys
  const apiKeys = await resolveProviderKeys(userId, provider);
  const apiKey = apiKeys[0];
  if (!apiKey) {
    return { isError: true, content: [{ type: "text", text: `No ${provider} API key found in your settings. Add one at kopern.ai → Settings → API Keys.` }] };
  }

  // Build grading cases with llm_judge criterion (auto-filled from expected behavior)
  const gradingCases = testCases.map((tc, i) => ({
    id: `mcp_case_${i}`,
    name: tc.name,
    inputPrompt: tc.input,
    expectedBehavior: tc.expected,
    orderIndex: i,
    criteria: [
      {
        id: `crit_${i}`,
        type: "llm_judge" as const,
        name: "Quality",
        config: {} as Record<string, unknown>,
        weight: 1,
      },
    ] satisfies CriterionConfig[],
    createdAt: { toDate: () => new Date(), toMillis: () => Date.now(), toJSON: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }) } as unknown as import("@firebase/firestore").Timestamp,
  }));

  // Execute each case by running the agent
  const executeCase = async (inputPrompt: string) => {
    const collector = createEventCollector();
    const messages: LLMMessage[] = [{ role: "user" as const, content: inputPrompt }];

    await new Promise<AgentRunMetrics>((resolve, reject) => {
      runAgentWithTools(
        {
          provider,
          model,
          systemPrompt,
          messages,
          userId,
          agentId,
          connectedRepos: [],
          apiKey,
          apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
          skipOutboundWebhooks: true,
          toolApprovalPolicy: "auto",
          riskLevel: "minimal",
        },
        {
          onToken: (text) => { collector.addToken(text); },
          onToolStart: () => {},
          onToolEnd: (result) => {
            collector.addToolCall({ name: result.name, args: {}, result: result.result, isError: result.isError });
          },
          onDone: (m) => { collector.finalize(); resolve(m); },
          onError: (err) => reject(err),
        }
      );
    });

    return collector;
  };

  try {
    const result = await runGradingSuite(gradingCases, executeCase);

    const summary = {
      overallScore: Math.round(result.score * 100) / 100,
      passed: result.passedCases,
      total: result.totalCases,
      cases: result.results.map((r) => ({
        name: r.caseName,
        passed: r.passed,
        score: Math.round(r.score * 100) / 100,
        output: r.agentOutput.slice(0, 500),
        criteria: r.criteriaResults.map((cr) => ({
          type: cr.criterionType,
          passed: cr.passed,
          score: Math.round(cr.score * 100) / 100,
          message: cr.message,
        })),
      })),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
    };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Grading error: ${(err as Error).message}` }] };
  }
}

// ─── List user's agents ─────────────────────────────────────────────

async function executeListAgents(userId: string) {
  const snap = await adminDb
    .collection("users")
    .doc(userId)
    .collection("agents")
    .orderBy("updatedAt", "desc")
    .limit(50)
    .get();

  const agents = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      description: data.description || null,
      domain: data.domain || null,
      model: { provider: data.modelProvider, id: data.modelId },
      latestGradingScore: data.latestGradingScore ?? null,
      version: data.version || 1,
    };
  });

  return {
    content: [{ type: "text", text: JSON.stringify({ count: agents.length, agents }, null, 2) }],
  };
}

// ─── POST handler (MCP Streamable HTTP) ──────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Authenticate (supports both agent-bound and user-level keys)
  const auth = await authenticate(request);
  if (!auth) {
    return jsonErr(null, -32000, "Missing or invalid API key", 401);
  }
  if (!auth.key.enabled) {
    return jsonErr(null, -32000, "API key is disabled", 403);
  }

  const userId = auth.key.userId;
  const agentId = auth.type === "agent" ? auth.key.agentId : null;

  // Rate limiting
  const rl = await checkRateLimit(mcpRateLimit, agentId || userId);
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
          description: "Grade AI system prompts against test cases, chat with agents, browse 37 templates, and manage your agent fleet.",
        },
      });
    }

    // ── Ping ──
    case "ping": {
      return jsonOk(body.id, {});
    }

    // ── List tools ──
    case "tools/list": {
      // User-level keys get platform tools only; agent keys get all tools
      if (agentId) {
        const agent = await loadAgent(userId, agentId);
        if (!agent) return jsonErr(body.id, -32000, "Agent not found");
        return jsonOk(body.id, { tools: buildToolList(agent) });
      }
      return jsonOk(body.id, { tools: buildPlatformToolList() });
    }

    // ── Call a tool ──
    case "tools/call": {
      const toolName = body.params?.name as string;
      const toolArgs = (body.params?.arguments as Record<string, unknown>) || {};

      // ── Platform tools (work with both key types) ──
      if (toolName === "kopern_list_templates") {
        return jsonOk(body.id, executeListTemplates(toolArgs));
      }

      if (toolName === "kopern_list_agents") {
        return jsonOk(body.id, await executeListAgents(userId));
      }

      if (toolName === "kopern_grade_prompt") {
        const tokenCheck = await checkPlanLimits(userId, "tokens");
        if (!tokenCheck.allowed) {
          return jsonOk(body.id, { isError: true, content: [{ type: "text", text: tokenCheck.reason || "Plan limit reached" }] });
        }
        const gradeCheck = await checkPlanLimits(userId, "grading");
        if (!gradeCheck.allowed) {
          return jsonOk(body.id, { isError: true, content: [{ type: "text", text: gradeCheck.reason || "Grading run limit reached" }] });
        }
        // grade_prompt uses a dummy agentId for user-level keys (no agent context needed)
        const result = await executeGradePrompt(userId, agentId || "__user__", toolArgs);
        return jsonOk(body.id, result);
      }

      // ── Agent-bound tools (require agent key) ──
      if (!agentId) {
        return jsonOk(body.id, {
          isError: true,
          content: [{ type: "text", text: `"${toolName}" requires an agent-bound API key. Create one at kopern.ai → Agent → MCP/API tab.` }],
        });
      }

      const tokenCheck = await checkPlanLimits(userId, "tokens");
      if (!tokenCheck.allowed) {
        return jsonOk(body.id, { isError: true, content: [{ type: "text", text: tokenCheck.reason || "Plan limit reached" }] });
      }

      const agent = await loadAgent(userId, agentId);
      if (!agent) return jsonErr(body.id, -32000, "Agent not found");

      switch (toolName) {
        case "kopern_chat": {
          const mcpServerId = auth.type === "agent" ? auth.key.mcpServerId : "";
          const skills = await loadSkills(userId, agentId);
          const result = await executeChat(userId, agentId, mcpServerId, agent, skills, toolArgs);
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
