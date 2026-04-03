// Shared agentic execution loop — used by chat, grading, teams, and pipelines

import { streamLLM, type LLMMessage, type ContentBlock, type ToolCallResult, type ToolDefinition } from "@/lib/llm/client";
import { adminDb } from "@/lib/firebase/admin";
import { estimateTokens } from "@/lib/billing/pricing";
import { logAppError } from "@/lib/errors/logger";
import { trackUsageServer } from "@/lib/billing/track-usage-server";
import {
  getGithubTools,
  getSlackTools,
  getCustomToolDefinitions,
  executeTool,
  type ToolExecutionContext,
} from "@/lib/tools/agent-tools";
import { getBugTools, executeBugTool, isBugTool } from "@/lib/tools/bug-tools";
import { getDatagouvTools, executeDatagouvTool, isDatagouvTool } from "@/lib/tools/datagouv-tools";
import { getPisteTools, executePisteTool, isPisteTool } from "@/lib/tools/piste-tools";
import { getMemoryTools, executeMemoryTool, isMemoryTool, injectMemoryContext } from "@/lib/tools/memory-tools";
import { getEmailTools, getCalendarTools, executeServiceTool, isServiceTool } from "@/lib/tools/service-tools";
import { WEB_FETCH_TOOLS, executeWebFetchTool, isWebFetchTool } from "@/lib/tools/web-fetch-tool";
import { CODE_INTERPRETER_TOOLS, executeCodeInterpreterTool, isCodeInterpreterTool } from "@/lib/tools/code-interpreter-tool";
import { IMAGE_GEN_TOOLS, executeImageGenTool, isImageGenTool } from "@/lib/tools/image-gen-tool";
import { runExtensions } from "@/lib/extensions/extension-runner";
import { fireOutboundWebhooks } from "@/lib/connectors/webhook";
import type { ExtensionEventType } from "@/lib/firebase/firestore";
import { truncateToolResults } from "@/lib/context/truncate";
import { shouldCompact, compactMessages } from "@/lib/context/compact";
import {
  requiresApproval,
  isDestructiveBuiltin,
  createApprovalGate,
  type ApprovalPolicy,
  type ApprovalDecision,
  type ApprovalRequest,
} from "@/lib/tools/approval";

const MAX_TOOL_ITERATIONS = 10;

export interface AgentRunConfig {
  provider: string;
  model: string;
  systemPrompt: string;
  messages: LLMMessage[];
  userId?: string;
  agentId?: string;
  connectedRepos?: string[];
  /** Override API key (from user Firestore settings). Falls back to process.env if not provided. */
  apiKey?: string;
  /** Multiple API keys for rotation/failover on 429. */
  apiKeys?: string[];
  /** Tool approval policy — defaults to "auto" (no approval needed) */
  toolApprovalPolicy?: ApprovalPolicy;
  /** Skip outbound webhooks — MUST be true for inbound webhook, Telegram, WhatsApp, Slack routes (anti-loop) */
  skipOutboundWebhooks?: boolean;
  /** EU AI Act risk level — high-risk agents require toolApprovalPolicy !== "auto" */
  riskLevel?: "minimal" | "limited" | "high";
}

export interface AgentRunCallbacks {
  onToken: (text: string) => void;
  onToolStart?: (toolCall: { name: string; args: Record<string, unknown> }) => void;
  onToolEnd?: (result: { name: string; result: string; isError: boolean }) => void;
  onApprovalRequest?: (request: ApprovalRequest) => Promise<ApprovalDecision>;
  /** Conversational approval for headless connectors (Telegram, WhatsApp, Slack).
   *  When set, destructive tools trigger a message to the user instead of auto-deny. */
  onConversationalApproval?: (request: ApprovalRequest) => Promise<ApprovalDecision>;
  onDone: (metrics: AgentRunMetrics) => void;
  onError: (error: Error) => void;
}

export interface AgentRunMetrics {
  inputTokens: number;
  outputTokens: number;
  toolCallCount: number;
  toolIterations: number;
}

/**
 * Runs an agent with full tool-calling support (agentic loop).
 * Loads tools from Firestore if userId + agentId are provided.
 * Tracks usage in Firestore after completion.
 */
export async function runAgentWithTools(
  config: AgentRunConfig,
  callbacks: AgentRunCallbacks
): Promise<void> {
  // EU AI Act Art. 6: high-risk agents MUST have tool approval enabled
  if (config.riskLevel === "high" && (!config.toolApprovalPolicy || config.toolApprovalPolicy === "auto")) {
    callbacks.onError?.(new Error("High-risk agents (EU AI Act) require a tool approval policy. Set to 'confirm_destructive' or 'confirm_all' in agent settings."));
    callbacks.onDone({ inputTokens: 0, outputTokens: 0, toolCallCount: 0, toolIterations: 0 });
    return;
  }

  const tools: ToolDefinition[] = [];
  const customToolDocs: { name: string; description: string; parametersSchema: string | Record<string, unknown>; executeCode: string }[] = [];
  const destructiveCustomTools = new Set<string>();
  const connectedRepos = [...(config.connectedRepos || [])];
  const agentBuiltinTools: string[] = [];
  const policy = config.toolApprovalPolicy || "auto";

  // Load tools from Firestore
  if (config.userId && config.agentId) {
    try {
      const toolsSnap = await adminDb
        .collection(`users/${config.userId}/agents/${config.agentId}/tools`)
        .get();
      for (const doc of toolsSnap.docs) {
        const t = doc.data();
        if (t.name && t.executeCode) {
          customToolDocs.push({
            name: t.name,
            description: t.description || "",
            parametersSchema: t.parametersSchema || '{"type":"object","properties":{}}',
            executeCode: t.executeCode,
          });
          if (t.destructive) {
            destructiveCustomTools.add(t.name);
          }
        }
      }
      if (customToolDocs.length > 0) {
        tools.push(...getCustomToolDefinitions(customToolDocs));
      }
    } catch {
      // Skip
    }

    // Load agent doc (single read for repos + builtinTools)
    try {
      const agentSnap = await adminDb
        .doc(`users/${config.userId}/agents/${config.agentId}`)
        .get();
      if (agentSnap.exists) {
        const agentData = agentSnap.data()!;
        if (connectedRepos.length === 0 && agentData.connectedRepos?.length) {
          connectedRepos.push(...agentData.connectedRepos);
        }
        const bt: string[] = agentData.builtinTools || [];
        agentBuiltinTools.push(...bt);
      }
    } catch {
      // Skip
    }
  }

  // Agent builtin tools (populated above from single agent doc read)
  const hasBugManagement = agentBuiltinTools.includes("bug_management");
  const hasGitHubWrite = agentBuiltinTools.includes("github_write");
  const hasDatagouv = agentBuiltinTools.includes("datagouv");
  const hasPiste = agentBuiltinTools.includes("piste");
  const hasMemory = agentBuiltinTools.includes("memory");
  const hasServiceEmail = agentBuiltinTools.includes("service_email");
  const hasServiceCalendar = agentBuiltinTools.includes("service_calendar");
  const hasWebFetch = agentBuiltinTools.includes("web_fetch");
  const hasCodeInterpreter = agentBuiltinTools.includes("code_interpreter");
  const hasImageGen = agentBuiltinTools.includes("image_generation");

  // GitHub tools (with write access if agent has github_write builtin)
  if (connectedRepos.length > 0) {
    tools.push(...getGithubTools(connectedRepos, hasGitHubWrite));
  }

  // Bug management tools
  if (hasBugManagement) {
    tools.push(...getBugTools());
  }

  // data.gouv.fr MCP tools (9 tools via server-side HTTP to mcp.data.gouv.fr)
  if (hasDatagouv) {
    tools.push(...getDatagouvTools());
  }

  // PISTE / Légifrance tools (6 tools via OAuth2 + HTTP to PISTE API)
  if (hasPiste) {
    tools.push(...getPisteTools());
  }

  // Agent memory tools (remember, recall, forget, search_sessions)
  if (hasMemory) {
    tools.push(...getMemoryTools());
  }

  // Service connector tools — email (Gmail/Outlook)
  if (hasServiceEmail) {
    tools.push(...getEmailTools());
  }

  // Service connector tools — calendar (Google/Outlook)
  if (hasServiceCalendar) {
    tools.push(...getCalendarTools());
  }

  // Web fetch tool (server-side HTTP fetch)
  if (hasWebFetch) {
    tools.push(...WEB_FETCH_TOOLS);
  }

  // Code interpreter (Cloud Run Docker sandbox)
  if (hasCodeInterpreter) {
    tools.push(...CODE_INTERPRETER_TOOLS);
  }

  // Image generation (Google Gemini)
  if (hasImageGen) {
    tools.push(...IMAGE_GEN_TOOLS);
  }

  // Slack tools (loaded when agent has a Slack connection with valid bot token)
  let slackBotToken: string | undefined;
  if (config.userId && config.agentId) {
    try {
      const slackSnap = await adminDb
        .doc(`users/${config.userId}/agents/${config.agentId}/connectors/slackConnection`)
        .get();
      const token = slackSnap.data()?.botToken as string | undefined;
      if (token && slackSnap.data()?.enabled !== false) {
        slackBotToken = token;
        tools.push(...getSlackTools());
      }
    } catch {
      // Skip — Slack tools are optional
    }
  }

  const toolCtx: ToolExecutionContext = {
    userId: config.userId || "",
    connectedRepos,
    customTools: customToolDocs,
    slackBotToken,
  };

  // Load extensions from Firestore
  const loadedExtensions: { id: string; name: string; events: ExtensionEventType[]; code: string; enabled: boolean }[] = [];
  if (config.userId && config.agentId) {
    try {
      const extSnap = await adminDb
        .collection(`users/${config.userId}/agents/${config.agentId}/extensions`)
        .where("enabled", "==", true)
        .get();
      for (const doc of extSnap.docs) {
        const ext = doc.data();
        if (ext.code) {
          loadedExtensions.push({
            id: doc.id,
            name: ext.name || "Extension",
            events: ext.events || [],
            code: ext.code,
            enabled: true,
          });
        }
      }
    } catch {
      // Skip — extensions are optional
    }
  }

  const fireExtension = async (eventType: ExtensionEventType, data: Record<string, unknown>) => {
    if (loadedExtensions.length === 0) return { blocked: false, logs: [] as string[] };
    return runExtensions(loadedExtensions, { eventType, data, sessionState: {} });
  };

  const messages = [...config.messages];
  let iteration = 0;
  let totalToolCalls = 0;

  // Inject current date (Europe/Paris, with day name and ISO week info) + tool usage reminder
  const now = new Date();
  const parisFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "long", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = Object.fromEntries(parisFmt.formatToParts(now).map(p => [p.type, p.value]));
  const parisDate = `${parts.year}-${parts.month}-${parts.day}`;
  const dateStr = `${parts.weekday}, ${parisDate} ${parts.hour}:${parts.minute} (Europe/Paris)`;
  // Compute Monday of current week (ISO: Monday=1)
  const parisNow = new Date(`${parisDate}T${parts.hour}:${parts.minute}:00+02:00`);
  const dow = parisNow.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(parisNow); monday.setDate(parisNow.getDate() + mondayOffset);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const weekStr = `Current week: Monday ${monday.toISOString().slice(0, 10)} to Sunday ${sunday.toISOString().slice(0, 10)}.`;
  let effectiveSystemPrompt = config.systemPrompt + `\n\nCurrent date and time: ${dateStr}.\n${weekStr}\nIMPORTANT: When the user asks you to perform an action (send email, create/update/cancel event, remember something, etc.), you MUST call the appropriate tool. Never pretend you performed an action without actually calling the tool.`;
  let compactionThreshold = 0;
  if (hasMemory && config.userId && config.agentId) {
    try {
      const agSnap = await adminDb.doc(`users/${config.userId}/agents/${config.agentId}`).get();
      const mc = agSnap.data()?.memoryConfig;
      if (mc?.enabled) {
        compactionThreshold = mc.compactionThreshold || 80_000;
        // Inject top 20 memories into system prompt
        effectiveSystemPrompt = await injectMemoryContext(effectiveSystemPrompt, config.userId, config.agentId);
      }
    } catch { /* skip */ }
  }

  // Token tracking
  const inputText = effectiveSystemPrompt + messages.map((m) =>
    typeof m.content === "string" ? m.content : JSON.stringify(m.content)
  ).join(" ");
  let inputTokens = estimateTokens(inputText);
  let outputTokens = 0;

  const runIteration = async (): Promise<void> => {
    // Context compaction: if messages exceed threshold, summarize older ones
    if (compactionThreshold > 0 && shouldCompact(messages, compactionThreshold)) {
      try {
        const { messages: compacted, tokensBefore, tokensAfter } = await compactMessages(
          messages,
          config.apiKey,
          config.apiKeys?.length ? config.apiKeys : undefined
        );
        messages.length = 0;
        messages.push(...compacted);
        logAppError({ code: "CONTEXT_COMPACTION", message: `Compacted ${tokensBefore} → ${tokensAfter} tokens`, source: "compaction", userId: config.userId, agentId: config.agentId });
      } catch { /* compaction failed, continue with original messages */ }
    }

    return new Promise((resolve, reject) => {
      const pendingToolCalls: ToolCallResult[] = [];

      // Truncate verbose tool results before sending to LLM
      const truncatedMessages = truncateToolResults(messages);

      streamLLM(
        {
          provider: config.provider,
          model: config.model,
          systemPrompt: effectiveSystemPrompt,
          messages: truncatedMessages,
          tools: tools.length > 0 ? tools : undefined,
          apiKey: config.apiKey,
          apiKeys: config.apiKeys,
        },
        {
          onToken: (text) => {
            outputTokens += estimateTokens(text);
            callbacks.onToken(text);
          },
          onToolCall: (toolCall) => {
            pendingToolCalls.push(toolCall);
            totalToolCalls++;
            callbacks.onToolStart?.({ name: toolCall.name, args: toolCall.input });
            fireExtension("tool_call_start", { toolName: toolCall.name, args: toolCall.input }).catch((err) => logAppError({ code: "EXTENSION_FIRE_FAILED", message: (err as Error).message, source: "chat", userId: config.userId, agentId: config.agentId }));
          },
          onDone: async (stopReason) => {
            try {
              if (stopReason === "tool_use" && pendingToolCalls.length > 0 && iteration < MAX_TOOL_ITERATIONS) {
                iteration++;

                const assistantContent: ContentBlock[] = pendingToolCalls.map((tc) => ({
                  type: "tool_use" as const,
                  id: tc.id,
                  name: tc.name,
                  input: tc.input,
                }));
                messages.push({ role: "assistant", content: assistantContent });

                const toolResults: ContentBlock[] = [];
                for (const tc of pendingToolCalls) {
                  // Tool approval check
                  const isDestructive = isDestructiveBuiltin(tc.name) || destructiveCustomTools.has(tc.name);
                  if (policy !== "auto" && requiresApproval(policy, tc.name, isDestructive)) {
                    if (callbacks.onApprovalRequest) {
                      // Interactive context (Playground/Widget) — ask user
                      const decision = await callbacks.onApprovalRequest({
                        toolCallId: tc.id,
                        toolName: tc.name,
                        args: tc.input,
                        isDestructive,
                      });
                      if (decision === "denied") {
                        toolResults.push({
                          type: "tool_result",
                          tool_use_id: tc.id,
                          content: "Tool execution denied by operator.",
                          is_error: true,
                        });
                        callbacks.onToolEnd?.({ name: tc.name, result: "Tool execution denied by operator.", isError: true });
                        continue;
                      }
                    } else if (callbacks.onConversationalApproval) {
                      // Conversational approval (Telegram, WhatsApp, Slack)
                      // Send approval message to user and wait for response
                      const decision = await callbacks.onConversationalApproval({
                        toolCallId: tc.id,
                        toolName: tc.name,
                        args: tc.input,
                        isDestructive,
                      });
                      if (decision === "denied") {
                        toolResults.push({
                          type: "tool_result",
                          tool_use_id: tc.id,
                          content: "Tool execution denied by user.",
                          is_error: true,
                        });
                        callbacks.onToolEnd?.({ name: tc.name, result: "Tool execution denied by user.", isError: true });
                        continue;
                      }
                    } else {
                      // Headless context with no approval support (Webhook, MCP, etc.)
                      const denyMsg = `Tool "${tc.name}" requires approval but this channel does not support interactive approval. Use the Kopern Playground to execute this action, or set the agent's Tool Approval Policy to "Automatic".`;
                      toolResults.push({
                        type: "tool_result",
                        tool_use_id: tc.id,
                        content: denyMsg,
                        is_error: true,
                      });
                      callbacks.onToolEnd?.({ name: tc.name, result: denyMsg, isError: true });
                      continue;
                    }
                  }

                  const result = isMemoryTool(tc.name)
                    ? await executeMemoryTool(tc.name, tc.input, config.userId || "", config.agentId || "")
                    : isServiceTool(tc.name)
                      ? await executeServiceTool(tc.name, tc.input, config.userId || "")
                      : isBugTool(tc.name)
                        ? await executeBugTool(tc.name, tc.input, config.userId || "")
                        : isDatagouvTool(tc.name)
                          ? await executeDatagouvTool(tc.name, tc.input)
                          : isPisteTool(tc.name)
                            ? await executePisteTool(tc.name, tc.input)
                            : isWebFetchTool(tc.name)
                              ? await executeWebFetchTool(tc.name, tc.input)
                              : isCodeInterpreterTool(tc.name)
                                ? await executeCodeInterpreterTool(tc.name, tc.input)
                                : isImageGenTool(tc.name)
                                  ? await executeImageGenTool(tc.name, tc.input, config.userId || "")
                                  : await executeTool(tc, toolCtx);
                  // Count tool result tokens as additional input
                  inputTokens += estimateTokens(result.result);
                  callbacks.onToolEnd?.({
                    name: tc.name,
                    result: result.result.slice(0, 2000),
                    isError: result.isError,
                  });
                  fireExtension(result.isError ? "tool_call_error" : "tool_call_end", {
                    toolName: tc.name,
                    result: result.result.slice(0, 1000),
                    isError: result.isError,
                  }).catch((err) => logAppError({ code: "EXTENSION_FIRE_FAILED", message: (err as Error).message, source: "chat", userId: config.userId, agentId: config.agentId }));
                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: tc.id,
                    content: result.result,
                    is_error: result.isError,
                  });
                }
                messages.push({ role: "user", content: toolResults });

                resolve(runIteration());
              } else {
                // Track usage in Firestore (fire-and-forget)
                if (config.userId && config.agentId) {
                  trackUsageServer(
                    config.userId,
                    config.agentId,
                    config.provider,
                    inputTokens,
                    outputTokens,
                    0,
                    config.model
                  ).catch((err) => logAppError({ code: "USAGE_TRACK_FAILED", message: (err as Error).message, source: "billing", userId: config.userId, agentId: config.agentId }));

                  // Fire outbound webhooks (fire-and-forget) — SKIP for inbound/connector routes (anti-loop)
                  if (!config.skipOutboundWebhooks) {
                    fireOutboundWebhooks(
                      config.userId,
                      config.agentId,
                      "message_sent",
                      { inputTokens, outputTokens, toolCallCount: totalToolCalls }
                    ).catch((err) => logAppError({ code: "OUTBOUND_WEBHOOK_FAILED", message: (err as Error).message, source: "webhook_outbound", userId: config.userId, agentId: config.agentId }));
                  }
                }

                const metrics: AgentRunMetrics = {
                  inputTokens,
                  outputTokens,
                  toolCallCount: totalToolCalls,
                  toolIterations: iteration,
                };
                callbacks.onDone(metrics);
                resolve();
              }
            } catch (err) {
              reject(err);
            }
          },
          onError: (error) => {
            // Still track partial usage on error
            if (config.userId && config.agentId && (inputTokens > 0 || outputTokens > 0)) {
              trackUsageServer(
                config.userId,
                config.agentId,
                config.provider,
                inputTokens,
                outputTokens
              ).catch((trackErr) => logAppError({ code: "USAGE_TRACK_FAILED", message: (trackErr as Error).message, source: "billing", userId: config.userId, agentId: config.agentId }));
            }
            callbacks.onError(error);
            resolve();
          },
        }
      );
    });
  };

  await runIteration();
}
