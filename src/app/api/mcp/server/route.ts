import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveApiKey, resolveUserApiKey, type ResolvedKey, type ResolvedUserKey } from "@/lib/mcp/auth";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { trackUsage } from "@/lib/mcp/token-counter";
import { logAppError } from "@/lib/errors/logger";
import { resolveProviderKeys } from "@/lib/llm/resolve-key";
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
import {
  executeCreateAgent,
  executeGetAgent,
  executeUpdateAgent,
  executeDeleteAgent,
  executeDeployTemplate,
  executeCreateGradingSuite,
  executeRunGrading,
  executeRunAutoresearch,
  executeCreateTeam,
  executeRunTeam,
  executeConnectWidget,
  executeConnectWebhook,
  executeConnectTelegram,
  executeConnectWhatsApp,
  executeConnectSlack,
  // Vague 2
  executeCreatePipeline,
  executeRunPipeline,
  executeListSessions,
  executeGetSession,
  executeManageMemory,
  executeComplianceReport,
  executeGetGradingResults,
  executeListGradingRuns,
  executeConnectEmail,
  executeConnectCalendar,
  executeGetUsage,
  executeExportAgent,
  executeImportAgent,
} from "@/lib/mcp/platform-tools";

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

/** All 19 tools — Vague 1 complete. Agent-bound tools + platform tools. */
const TOOL_DEFS = {
  // ── Agent-bound (require agent key) ──
  kopern_chat: {
    name: "kopern_chat",
    description: "Send a message to an agent and get a response. The agent uses its configured tools, skills, and extensions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        message: { type: "string", description: "The message to send to the agent" },
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
  kopern_agent_info: {
    name: "kopern_agent_info",
    description: "Get metadata about this agent (name, description, model, configuration).",
    inputSchema: { type: "object" as const, properties: {} },
  },

  // ── Platform tools (work with any key) ──
  kopern_list_templates: {
    name: "kopern_list_templates",
    description: "List all 37 AI agent templates (28 general + 9 vertical/business). Returns slug, title, domain, tagline. No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        category: { type: "string", enum: ["all", "general", "vertical"], description: "Filter by category. Default: all" },
      },
    },
  },
  kopern_list_agents: {
    name: "kopern_list_agents",
    description: "List all your Kopern agents (name, description, model, domain, grading score). No LLM cost.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  kopern_grade_prompt: {
    name: "kopern_grade_prompt",
    description: "Grade a system prompt against inline test cases. Uses 6 criteria types (output_match, schema_validation, tool_usage, safety_check, custom_script, llm_judge). Returns score 0-1. Uses YOUR API keys.",
    inputSchema: {
      type: "object" as const,
      properties: {
        system_prompt: { type: "string", description: "The system prompt to evaluate" },
        test_cases: {
          type: "array",
          description: "Test cases: { name, input, expected }",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              input: { type: "string", description: "User message to send" },
              expected: { type: "string", description: "Expected behavior (for llm_judge)" },
            },
            required: ["name", "input", "expected"],
          },
        },
        provider: { type: "string", enum: ["anthropic", "openai", "google", "mistral"], description: "LLM provider. Default: anthropic" },
        model: { type: "string", description: "Model ID. Default: provider default" },
      },
      required: ["system_prompt", "test_cases"],
    },
  },
  kopern_create_agent: {
    name: "kopern_create_agent",
    description: "Create a new AI agent with a system prompt, model, and optional skills. Returns the agentId.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Agent name" },
        system_prompt: { type: "string", description: "The agent's system prompt" },
        description: { type: "string", description: "Short description" },
        domain: { type: "string", description: "Domain (e.g. 'customer_support', 'coding', 'other'). Default: other" },
        provider: { type: "string", enum: ["anthropic", "openai", "google", "mistral", "ollama"], description: "LLM provider. Default: anthropic" },
        model: { type: "string", description: "Model ID. Default: claude-sonnet-4-6" },
        builtin_tools: {
          type: "array",
          description: "Built-in tools to enable: web_fetch, memory, github_read, github_write, bug_management, datagouv, piste, service_email, service_calendar",
          items: { type: "string" },
        },
        skills: {
          type: "array",
          description: "Optional skills (domain knowledge blocks)",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              content: { type: "string", description: "Skill content (instructions, knowledge)" },
            },
            required: ["name", "content"],
          },
        },
      },
      required: ["name", "system_prompt"],
    },
  },
  kopern_get_agent: {
    name: "kopern_get_agent",
    description: "Get full details of an agent: system prompt, model, skills count, tools count, grading suites count.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
      },
      required: ["agent_id"],
    },
  },
  kopern_update_agent: {
    name: "kopern_update_agent",
    description: "Update an agent's configuration (name, system prompt, model, builtin tools, etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        name: { type: "string", description: "New agent name" },
        description: { type: "string", description: "New agent description" },
        domain: { type: "string", description: "New agent domain/category" },
        system_prompt: { type: "string", description: "New system prompt" },
        provider: { type: "string", description: "LLM provider (anthropic, openai, google, mistral, ollama)" },
        model: { type: "string", description: "Model ID override" },
        builtin_tools: { type: "array", description: "Built-in tools to enable: web_fetch, memory, github_read, github_write, bug_management, datagouv, piste, service_email, service_calendar", items: { type: "string" } },
      },
      required: ["agent_id"],
    },
  },
  kopern_delete_agent: {
    name: "kopern_delete_agent",
    description: "Permanently delete an agent and all its data (skills, tools, grading suites, sessions, connectors).",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID to delete" },
      },
      required: ["agent_id"],
    },
  },
  kopern_deploy_template: {
    name: "kopern_deploy_template",
    description: "Deploy an agent from a template (28 general + 9 vertical). Creates agent + skills + tools + grading suite in one shot. Use kopern_list_templates to see available slugs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Template slug (from kopern_list_templates)" },
        answers: {
          type: "object",
          description: "Onboarding answers to personalize the template (e.g. { businessName: 'Plomberie Dupont', zone: 'Paris 12-15' })",
          additionalProperties: { type: "string" },
        },
      },
      required: ["slug"],
    },
  },
  kopern_create_grading_suite: {
    name: "kopern_create_grading_suite",
    description: "Create a grading suite with test cases on an agent. Each case has an input prompt and expected behavior for evaluation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        name: { type: "string", description: "Suite name (optional)" },
        description: { type: "string", description: "Suite description (optional)" },
        cases: {
          type: "array",
          description: "Test cases",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Case name" },
              input: { type: "string", description: "User message to test" },
              expected: { type: "string", description: "Expected behavior" },
              criterion_type: { type: "string", enum: ["output_match", "schema_validation", "tool_usage", "safety_check", "custom_script", "llm_judge"], description: "Evaluation method. Default: llm_judge" },
            },
            required: ["name", "input", "expected"],
          },
        },
      },
      required: ["agent_id", "cases"],
    },
  },
  kopern_run_grading: {
    name: "kopern_run_grading",
    description: "Run a grading suite on an agent. Executes all test cases, evaluates with configured criteria, returns detailed scores. Uses YOUR API keys.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        suite_id: { type: "string", description: "The grading suite ID" },
      },
      required: ["agent_id", "suite_id"],
    },
  },
  kopern_run_autoresearch: {
    name: "kopern_run_autoresearch",
    description: "Run AutoTune optimization on an agent. Iteratively mutates the system prompt, re-grades, and keeps improvements. Returns the optimized score. Uses YOUR API keys. Can take several minutes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        suite_id: { type: "string", description: "The grading suite ID to optimize against" },
        max_iterations: { type: "number", description: "Max optimization iterations (1-20). Default: 5" },
        target_score: { type: "number", description: "Stop when this score is reached (0-1). Optional" },
        max_token_budget: { type: "number", description: "Max total tokens to spend. Optional" },
      },
      required: ["agent_id", "suite_id"],
    },
  },
  kopern_create_team: {
    name: "kopern_create_team",
    description: "Create a multi-agent team. Agents work together in parallel, sequential (chain), or conditional (router) mode.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Team name" },
        description: { type: "string", description: "Team description" },
        execution_mode: { type: "string", enum: ["parallel", "sequential", "conditional"], description: "How agents collaborate. Default: sequential" },
        agents: {
          type: "array",
          description: "Team members",
          items: {
            type: "object",
            properties: {
              agent_id: { type: "string", description: "Agent ID" },
              role: { type: "string", description: "Role: coordinator, specialist, reviewer, etc." },
              order: { type: "number", description: "Execution order (for sequential/conditional)" },
            },
            required: ["agent_id", "role"],
          },
        },
      },
      required: ["name", "agents"],
    },
  },
  kopern_run_team: {
    name: "kopern_run_team",
    description: "Execute a multi-agent team on a prompt. Returns each agent's output and the final combined result. Uses YOUR API keys.",
    inputSchema: {
      type: "object" as const,
      properties: {
        team_id: { type: "string", description: "The team ID" },
        prompt: { type: "string", description: "The task/prompt to send to the team" },
      },
      required: ["team_id", "prompt"],
    },
  },
  kopern_connect_widget: {
    name: "kopern_connect_widget",
    description: "Enable the embeddable chat widget for an agent. Returns the <script> embed code for your website.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        welcome_message: { type: "string", description: "Greeting message shown in widget" },
        position: { type: "string", enum: ["bottom-right", "bottom-left"], description: "Widget position. Default: bottom-right" },
        allowed_origins: { type: "array", items: { type: "string" }, description: "Allowed website domains (CORS). Empty = all origins." },
      },
      required: ["agent_id"],
    },
  },
  kopern_connect_telegram: {
    name: "kopern_connect_telegram",
    description: "Connect an agent to Telegram via a bot. Requires a bot token from @BotFather.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        bot_token: { type: "string", description: "Telegram bot token from @BotFather" },
      },
      required: ["agent_id", "bot_token"],
    },
  },
  kopern_connect_whatsapp: {
    name: "kopern_connect_whatsapp",
    description: "Connect an agent to WhatsApp Business. Requires Meta Cloud API credentials.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        phone_number_id: { type: "string", description: "WhatsApp phone number ID (from Meta dashboard)" },
        access_token: { type: "string", description: "WhatsApp Cloud API access token" },
        verify_token: { type: "string", description: "Webhook verify token (optional)" },
        phone_number: { type: "string", description: "Display phone number (optional)" },
      },
      required: ["agent_id", "phone_number_id", "access_token"],
    },
  },
  kopern_connect_slack: {
    name: "kopern_connect_slack",
    description: "Connect an agent to Slack. Returns an OAuth install URL to authorize in your browser (Slack requires interactive OAuth).",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
      },
      required: ["agent_id"],
    },
  },
  kopern_connect_webhook: {
    name: "kopern_connect_webhook",
    description: "Create an inbound or outbound webhook for an agent. Inbound: receive messages via HTTP POST. Outbound: send events to your URL (n8n, Zapier, Make compatible).",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        type: { type: "string", enum: ["inbound", "outbound"], description: "Webhook direction. Default: inbound" },
        name: { type: "string", description: "Webhook name" },
        target_url: { type: "string", description: "Target URL (required for outbound)" },
        secret: { type: "string", description: "HMAC secret for signature verification (optional)" },
        events: {
          type: "array",
          description: "Events to subscribe to (outbound only): message_sent, tool_call_completed, session_ended, error",
          items: { type: "string" },
        },
      },
      required: ["agent_id"],
    },
  },

  // ── Vague 2 — Ecosystem Tools ──────────────────────────────────
  kopern_create_pipeline: {
    name: "kopern_create_pipeline",
    description: "Create a multi-step pipeline on an agent. Steps chain agents sequentially with configurable input mapping.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The parent agent ID" },
        name: { type: "string", description: "Pipeline name" },
        description: { type: "string", description: "Pipeline description" },
        steps: {
          type: "array",
          description: "Pipeline steps",
          items: {
            type: "object",
            properties: {
              agent_id: { type: "string", description: "Agent ID for this step" },
              role: { type: "string", description: "Step role (e.g. processor, reviewer)" },
              order: { type: "number", description: "Execution order" },
              input_mapping: { type: "string", enum: ["previous_output", "original_input", "custom"], description: "Input source. Default: previous_output" },
              custom_input_template: { type: "string", description: "Template with {{original_input}} and {{previous_output}} placeholders" },
              continue_on_error: { type: "boolean", description: "Continue pipeline if this step fails. Default: false" },
            },
            required: ["agent_id"],
          },
        },
      },
      required: ["agent_id", "name", "steps"],
    },
  },
  kopern_run_pipeline: {
    name: "kopern_run_pipeline",
    description: "Execute a pipeline on a prompt. Steps run sequentially, each feeding its output to the next. Uses YOUR API keys.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The parent agent ID" },
        pipeline_id: { type: "string", description: "The pipeline ID" },
        prompt: { type: "string", description: "The input prompt" },
      },
      required: ["agent_id", "pipeline_id", "prompt"],
    },
  },
  kopern_list_sessions: {
    name: "kopern_list_sessions",
    description: "List conversation sessions for an agent. Shows purpose, source, token usage, cost, timestamps. No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        limit: { type: "number", description: "Max sessions to return (1-50). Default: 20" },
      },
      required: ["agent_id"],
    },
  },
  kopern_get_session: {
    name: "kopern_get_session",
    description: "Get full details of a session including message events, tool calls, and metrics. No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        session_id: { type: "string", description: "The session ID" },
      },
      required: ["agent_id", "session_id"],
    },
  },
  kopern_manage_memory: {
    name: "kopern_manage_memory",
    description: "Manage an agent's persistent memory. Actions: remember (save key-value), recall (search by query), forget (delete by key), list (all memories). No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        action: { type: "string", enum: ["remember", "recall", "forget", "list"], description: "Memory action" },
        key: { type: "string", description: "Memory key (for remember/forget)" },
        value: { type: "string", description: "Memory value (for remember)" },
        category: { type: "string", enum: ["fact", "preference", "context", "custom"], description: "Memory category (for remember). Default: custom" },
        query: { type: "string", description: "Search query (for recall)" },
      },
      required: ["agent_id", "action"],
    },
  },
  kopern_compliance_report: {
    name: "kopern_compliance_report",
    description: "Generate an EU AI Act compliance report for an agent. Checks Art. 6 (risk), Art. 12 (audit trail), Art. 14 (human oversight), Art. 52 (transparency). No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
      },
      required: ["agent_id"],
    },
  },
  kopern_get_grading_results: {
    name: "kopern_get_grading_results",
    description: "Get detailed results of a grading run: per-case scores, agent outputs, criteria evaluations, improvement notes. No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        suite_id: { type: "string", description: "The grading suite ID" },
        run_id: { type: "string", description: "The grading run ID" },
      },
      required: ["agent_id", "suite_id", "run_id"],
    },
  },
  kopern_list_grading_runs: {
    name: "kopern_list_grading_runs",
    description: "List grading runs for a suite. Shows score history, pass rates, and versions over time. No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        suite_id: { type: "string", description: "The grading suite ID" },
      },
      required: ["agent_id", "suite_id"],
    },
  },
  kopern_connect_email: {
    name: "kopern_connect_email",
    description: "Connect an agent to Gmail or Outlook for email tools (read_emails, send_email, reply_email). Requires OAuth in browser. Enables the service_email builtin tool.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        provider: { type: "string", enum: ["google", "microsoft"], description: "Email provider" },
      },
      required: ["agent_id", "provider"],
    },
  },
  kopern_connect_calendar: {
    name: "kopern_connect_calendar",
    description: "Connect an agent to Google Calendar or Microsoft Calendar for scheduling tools (list_events, create_event, etc.). Requires OAuth in browser. Enables the service_calendar builtin tool.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID" },
        provider: { type: "string", enum: ["google", "microsoft"], description: "Calendar provider" },
      },
      required: ["agent_id", "provider"],
    },
  },
  kopern_get_usage: {
    name: "kopern_get_usage",
    description: "Get token usage and cost metrics. Shows input/output tokens, cost, grading runs, and per-agent breakdown. No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        year_month: { type: "string", description: "Period in YYYY-MM format. Default: current month" },
        include_history: { type: "boolean", description: "Include last 6 months history. Default: false" },
      },
    },
  },
  kopern_export_agent: {
    name: "kopern_export_agent",
    description: "Export an agent as a portable JSON object (agent config, skills, tools, extensions, grading suites with cases). Use kopern_import_agent to re-import. No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        agent_id: { type: "string", description: "The agent ID to export" },
      },
      required: ["agent_id"],
    },
  },
  kopern_import_agent: {
    name: "kopern_import_agent",
    description: "Import an agent from a Kopern export JSON. Creates a new agent with all skills, tools, extensions, and grading suites. No LLM cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        data: {
          type: "object",
          description: "The full Kopern agent export JSON (from kopern_export_agent)",
        },
      },
      required: ["data"],
    },
  },
};

/** Tools available with agent-bound key (all 32) */
// MCP tool annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
const TOOL_ANNOTATIONS: Record<string, { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean }> = {
  kopern_chat: { readOnlyHint: false, openWorldHint: true },
  kopern_agent_info: { readOnlyHint: true },
  kopern_list_templates: { readOnlyHint: true },
  kopern_list_agents: { readOnlyHint: true },
  kopern_grade_prompt: { readOnlyHint: true, openWorldHint: true },
  kopern_create_agent: { readOnlyHint: false, idempotentHint: false },
  kopern_get_agent: { readOnlyHint: true },
  kopern_update_agent: { readOnlyHint: false, idempotentHint: true },
  kopern_delete_agent: { readOnlyHint: false, destructiveHint: true },
  kopern_deploy_template: { readOnlyHint: false, idempotentHint: false },
  kopern_create_grading_suite: { readOnlyHint: false, idempotentHint: false },
  kopern_run_grading: { readOnlyHint: false, openWorldHint: true },
  kopern_run_autoresearch: { readOnlyHint: false, openWorldHint: true },
  kopern_create_team: { readOnlyHint: false, idempotentHint: false },
  kopern_run_team: { readOnlyHint: false, openWorldHint: true },
  kopern_connect_widget: { readOnlyHint: false, idempotentHint: true },
  kopern_connect_telegram: { readOnlyHint: false, idempotentHint: true },
  kopern_connect_whatsapp: { readOnlyHint: false, idempotentHint: true },
  kopern_connect_slack: { readOnlyHint: true },
  kopern_connect_webhook: { readOnlyHint: false, idempotentHint: false },
  kopern_create_pipeline: { readOnlyHint: false, idempotentHint: false },
  kopern_run_pipeline: { readOnlyHint: false, openWorldHint: true },
  kopern_list_sessions: { readOnlyHint: true },
  kopern_get_session: { readOnlyHint: true },
  kopern_manage_memory: { readOnlyHint: false },
  kopern_compliance_report: { readOnlyHint: true },
  kopern_get_grading_results: { readOnlyHint: true },
  kopern_list_grading_runs: { readOnlyHint: true },
  kopern_connect_email: { readOnlyHint: false },
  kopern_connect_calendar: { readOnlyHint: false },
  kopern_get_usage: { readOnlyHint: true },
  kopern_export_agent: { readOnlyHint: true },
  kopern_import_agent: { readOnlyHint: false, idempotentHint: false },
};

function withAnnotations(tool: Record<string, unknown>) {
  const annotations = TOOL_ANNOTATIONS[tool.name as string];
  return annotations ? { ...tool, annotations } : tool;
}

function buildToolList(agent: Record<string, unknown>) {
  const chat = {
    ...TOOL_DEFS.kopern_chat,
    description: `Send a message to the "${agent.name}" agent and get a response. The agent uses its configured tools, skills, and extensions.`,
  };
  return [
    chat,
    TOOL_DEFS.kopern_agent_info,
    // V1 platform
    TOOL_DEFS.kopern_list_templates,
    TOOL_DEFS.kopern_list_agents,
    TOOL_DEFS.kopern_grade_prompt,
    TOOL_DEFS.kopern_create_agent,
    TOOL_DEFS.kopern_get_agent,
    TOOL_DEFS.kopern_update_agent,
    TOOL_DEFS.kopern_delete_agent,
    TOOL_DEFS.kopern_deploy_template,
    TOOL_DEFS.kopern_create_grading_suite,
    TOOL_DEFS.kopern_run_grading,
    TOOL_DEFS.kopern_run_autoresearch,
    TOOL_DEFS.kopern_create_team,
    TOOL_DEFS.kopern_run_team,
    TOOL_DEFS.kopern_connect_widget,
    TOOL_DEFS.kopern_connect_telegram,
    TOOL_DEFS.kopern_connect_whatsapp,
    TOOL_DEFS.kopern_connect_slack,
    TOOL_DEFS.kopern_connect_webhook,
    // V2 ecosystem
    TOOL_DEFS.kopern_create_pipeline,
    TOOL_DEFS.kopern_run_pipeline,
    TOOL_DEFS.kopern_list_sessions,
    TOOL_DEFS.kopern_get_session,
    TOOL_DEFS.kopern_manage_memory,
    TOOL_DEFS.kopern_compliance_report,
    TOOL_DEFS.kopern_get_grading_results,
    TOOL_DEFS.kopern_list_grading_runs,
    TOOL_DEFS.kopern_connect_email,
    TOOL_DEFS.kopern_connect_calendar,
    TOOL_DEFS.kopern_get_usage,
    TOOL_DEFS.kopern_export_agent,
    TOOL_DEFS.kopern_import_agent,
  ].map(withAnnotations);
}

/** Tools available with user-level key (30 platform tools, no kopern_chat / kopern_agent_info) */
function buildPlatformToolList() {
  return [
    // V1
    TOOL_DEFS.kopern_list_templates,
    TOOL_DEFS.kopern_list_agents,
    TOOL_DEFS.kopern_grade_prompt,
    TOOL_DEFS.kopern_create_agent,
    TOOL_DEFS.kopern_get_agent,
    TOOL_DEFS.kopern_update_agent,
    TOOL_DEFS.kopern_delete_agent,
    TOOL_DEFS.kopern_deploy_template,
    TOOL_DEFS.kopern_create_grading_suite,
    TOOL_DEFS.kopern_run_grading,
    TOOL_DEFS.kopern_run_autoresearch,
    TOOL_DEFS.kopern_create_team,
    TOOL_DEFS.kopern_run_team,
    TOOL_DEFS.kopern_connect_widget,
    TOOL_DEFS.kopern_connect_telegram,
    TOOL_DEFS.kopern_connect_whatsapp,
    TOOL_DEFS.kopern_connect_slack,
    TOOL_DEFS.kopern_connect_webhook,
    // V2
    TOOL_DEFS.kopern_create_pipeline,
    TOOL_DEFS.kopern_run_pipeline,
    TOOL_DEFS.kopern_list_sessions,
    TOOL_DEFS.kopern_get_session,
    TOOL_DEFS.kopern_manage_memory,
    TOOL_DEFS.kopern_compliance_report,
    TOOL_DEFS.kopern_get_grading_results,
    TOOL_DEFS.kopern_list_grading_runs,
    TOOL_DEFS.kopern_connect_email,
    TOOL_DEFS.kopern_connect_calendar,
    TOOL_DEFS.kopern_get_usage,
    TOOL_DEFS.kopern_export_agent,
    TOOL_DEFS.kopern_import_agent,
  ].map(withAnnotations);
}

// ─── Tool execution (agent-bound only: chat + agent_info) ───────────

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

// ─── List templates (inline, no LLM) ───────────────────────────────

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

// ─── Grade a prompt (inline) ───────────────────────────────────────

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
    createdAt: { toDate: () => new Date(), toMillis: () => Date.now(), toJSON: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }) } as unknown as import("firebase/firestore").Timestamp,
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

// ─── List user's agents ────────────────────────────────────────────

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

// ─── Platform tool dispatcher ──────────────────────────────────────

/** Set of tool names that work with any key type (user-level or agent-bound) */
const PLATFORM_TOOLS = new Set([
  // V1
  "kopern_list_templates",
  "kopern_list_agents",
  "kopern_grade_prompt",
  "kopern_create_agent",
  "kopern_get_agent",
  "kopern_update_agent",
  "kopern_delete_agent",
  "kopern_deploy_template",
  "kopern_create_grading_suite",
  "kopern_run_grading",
  "kopern_run_autoresearch",
  "kopern_create_team",
  "kopern_run_team",
  "kopern_connect_widget",
  "kopern_connect_telegram",
  "kopern_connect_whatsapp",
  "kopern_connect_slack",
  "kopern_connect_webhook",
  // V2
  "kopern_create_pipeline",
  "kopern_run_pipeline",
  "kopern_list_sessions",
  "kopern_get_session",
  "kopern_manage_memory",
  "kopern_compliance_report",
  "kopern_get_grading_results",
  "kopern_list_grading_runs",
  "kopern_connect_email",
  "kopern_connect_calendar",
  "kopern_get_usage",
  "kopern_export_agent",
  "kopern_import_agent",
]);

/** Dispatch a platform tool call. Returns null if the tool is not a platform tool. */
async function dispatchPlatformTool(
  toolName: string,
  toolArgs: Record<string, unknown>,
  userId: string,
  agentId: string | null
) {
  switch (toolName) {
    case "kopern_list_templates":
      return executeListTemplates(toolArgs);
    case "kopern_list_agents":
      return await executeListAgents(userId);
    case "kopern_grade_prompt":
      return await executeGradePrompt(userId, agentId || "__user__", toolArgs);
    case "kopern_create_agent":
      return await executeCreateAgent(userId, toolArgs);
    case "kopern_get_agent":
      return await executeGetAgent(userId, toolArgs);
    case "kopern_update_agent":
      return await executeUpdateAgent(userId, toolArgs);
    case "kopern_delete_agent":
      return await executeDeleteAgent(userId, toolArgs);
    case "kopern_deploy_template":
      return await executeDeployTemplate(userId, toolArgs);
    case "kopern_create_grading_suite":
      return await executeCreateGradingSuite(userId, toolArgs);
    case "kopern_run_grading":
      return await executeRunGrading(userId, toolArgs);
    case "kopern_run_autoresearch":
      return await executeRunAutoresearch(userId, toolArgs);
    case "kopern_create_team":
      return await executeCreateTeam(userId, toolArgs);
    case "kopern_run_team":
      return await executeRunTeam(userId, toolArgs);
    case "kopern_connect_widget":
      return await executeConnectWidget(userId, toolArgs);
    case "kopern_connect_telegram":
      return await executeConnectTelegram(userId, toolArgs);
    case "kopern_connect_whatsapp":
      return await executeConnectWhatsApp(userId, toolArgs);
    case "kopern_connect_slack":
      return await executeConnectSlack(userId, toolArgs);
    case "kopern_connect_webhook":
      return await executeConnectWebhook(userId, toolArgs);
    // V2
    case "kopern_create_pipeline":
      return await executeCreatePipeline(userId, toolArgs);
    case "kopern_run_pipeline":
      return await executeRunPipeline(userId, toolArgs);
    case "kopern_list_sessions":
      return await executeListSessions(userId, toolArgs);
    case "kopern_get_session":
      return await executeGetSession(userId, toolArgs);
    case "kopern_manage_memory":
      return await executeManageMemory(userId, toolArgs);
    case "kopern_compliance_report":
      return await executeComplianceReport(userId, toolArgs);
    case "kopern_get_grading_results":
      return await executeGetGradingResults(userId, toolArgs);
    case "kopern_list_grading_runs":
      return await executeListGradingRuns(userId, toolArgs);
    case "kopern_connect_email":
      return await executeConnectEmail(userId, toolArgs);
    case "kopern_connect_calendar":
      return await executeConnectCalendar(userId, toolArgs);
    case "kopern_get_usage":
      return await executeGetUsage(userId, toolArgs);
    case "kopern_export_agent":
      return await executeExportAgent(userId, toolArgs);
    case "kopern_import_agent":
      return await executeImportAgent(userId, toolArgs);
    default:
      return null;
  }
}

// ─── POST handler (MCP Streamable HTTP) ──────────────────────────────

export const maxDuration = 300;

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
          prompts: {},
          resources: {},
        },
        serverInfo: {
          name: "Kopern",
          version: "2.0.0",
          description: "Full AI agent lifecycle: create, grade, optimize, deploy, orchestrate, monitor — 32 tools via MCP.",
          homepage: "https://kopern.ai",
          icon: "https://kopern.ai/logo_small.png",
        },
      });
    }

    // ── Prompts ──
    case "prompts/list": {
      return jsonOk(body.id, {
        prompts: [
          {
            name: "create-agent",
            description: "Step-by-step guide to create, configure and deploy a new AI agent on Kopern",
            arguments: [
              { name: "use_case", description: "What the agent should do (e.g. 'customer support chatbot for a restaurant')", required: true },
            ],
          },
          {
            name: "grade-and-improve",
            description: "Create a grading suite, run evaluation, and optimize an existing agent with AutoResearch",
            arguments: [
              { name: "agent_id", description: "The agent to evaluate and improve", required: true },
            ],
          },
          {
            name: "deploy-everywhere",
            description: "Deploy an agent to all available channels: widget, Slack, Telegram, WhatsApp, webhooks",
            arguments: [
              { name: "agent_id", description: "The agent to deploy", required: true },
            ],
          },
        ],
      });
    }

    case "prompts/get": {
      const promptName = body.params?.name as string;
      const promptArgs = ((body.params as Record<string, unknown>)?.arguments ?? {}) as Record<string, string>;

      if (promptName === "create-agent") {
        return jsonOk(body.id, {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `I want to create a new AI agent on Kopern for this use case: "${promptArgs.use_case || "general assistant"}".

Please follow these steps:
1. First, list available templates with kopern_list_templates to see if one matches
2. If a template matches, deploy it with kopern_deploy_template
3. If no template matches, create a custom agent with kopern_create_agent — write a detailed system prompt
4. Then create a grading suite with kopern_create_grading_suite (3-5 test cases)
5. Run grading with kopern_run_grading to get a baseline score
6. If score < 80%, run kopern_run_autoresearch to optimize
7. Finally, deploy with kopern_connect_widget`,
              },
            },
          ],
        });
      }

      if (promptName === "grade-and-improve") {
        return jsonOk(body.id, {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `I want to evaluate and improve agent "${promptArgs.agent_id}".

Please follow these steps:
1. Get the agent details with kopern_get_agent
2. Create a grading suite with kopern_create_grading_suite (5+ realistic test cases covering edge cases)
3. Run grading with kopern_run_grading
4. Review results with kopern_get_grading_results
5. If score < 90%, run kopern_run_autoresearch to auto-optimize the prompt
6. Run grading again to confirm improvement`,
              },
            },
          ],
        });
      }

      if (promptName === "deploy-everywhere") {
        return jsonOk(body.id, {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `I want to deploy agent "${promptArgs.agent_id}" to all channels.

Please help me set up each channel:
1. kopern_connect_widget — embeddable chat widget for websites
2. kopern_connect_slack — Slack workspace bot
3. kopern_connect_telegram — Telegram bot (needs bot token from @BotFather)
4. kopern_connect_whatsapp — WhatsApp Business (needs Meta phone_number_id + access_token)
5. kopern_connect_webhook — inbound/outbound webhooks for n8n, Zapier, Make

Ask me which channels I want to enable and what credentials I have ready.`,
              },
            },
          ],
        });
      }

      return jsonOk(body.id, { isError: true, messages: [{ role: "user", content: { type: "text", text: `Unknown prompt: ${promptName}` } }] });
    }

    // ── Resources (empty) ──
    case "resources/list": {
      return jsonOk(body.id, { resources: [] });
    }

    // ── Ping ──
    case "ping": {
      return jsonOk(body.id, {});
    }

    // ── List tools ──
    case "tools/list": {
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
      if (PLATFORM_TOOLS.has(toolName)) {
        // Plan limit checks for LLM-consuming tools
        if (["kopern_grade_prompt", "kopern_run_grading", "kopern_run_autoresearch", "kopern_run_team", "kopern_run_pipeline"].includes(toolName)) {
          const tokenCheck = await checkPlanLimits(userId, "tokens");
          if (!tokenCheck.allowed) {
            return jsonOk(body.id, { isError: true, content: [{ type: "text", text: tokenCheck.reason || "Plan limit reached" }] });
          }
        }
        if (["kopern_grade_prompt", "kopern_run_grading"].includes(toolName)) {
          const gradeCheck = await checkPlanLimits(userId, "grading");
          if (!gradeCheck.allowed) {
            return jsonOk(body.id, { isError: true, content: [{ type: "text", text: gradeCheck.reason || "Grading run limit reached" }] });
          }
        }
        if (["kopern_create_team", "kopern_run_team", "kopern_create_pipeline", "kopern_run_pipeline"].includes(toolName)) {
          const teamCheck = await checkPlanLimits(userId, "teams");
          if (!teamCheck.allowed) {
            return jsonOk(body.id, { isError: true, content: [{ type: "text", text: teamCheck.reason || "Teams limit reached" }] });
          }
        }

        try {
          const result = await dispatchPlatformTool(toolName, toolArgs, userId, agentId);
          if (result) return jsonOk(body.id, result);
        } catch (e) {
          console.error(`[MCP] Tool ${toolName} error:`, e);
          return jsonOk(body.id, { isError: true, content: [{ type: "text", text: `Internal error: ${e instanceof Error ? e.message : String(e)}` }] });
        }
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
