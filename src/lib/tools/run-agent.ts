// Shared agentic execution loop — used by chat, grading, teams, and pipelines

import { streamLLM, type LLMMessage, type ContentBlock, type ToolCallResult, type ToolDefinition } from "@/lib/llm/client";
import { adminDb } from "@/lib/firebase/admin";
import { estimateTokens } from "@/lib/billing/pricing";
import { trackUsageServer } from "@/lib/billing/track-usage-server";
import {
  getGithubTools,
  getCustomToolDefinitions,
  executeTool,
  type ToolExecutionContext,
} from "@/lib/tools/agent-tools";
import { getBugTools, executeBugTool, isBugTool } from "@/lib/tools/bug-tools";
import { runExtensions } from "@/lib/extensions/extension-runner";
import type { ExtensionEventType } from "@/lib/firebase/firestore";

const MAX_TOOL_ITERATIONS = 10;

export interface AgentRunConfig {
  provider: string;
  model: string;
  systemPrompt: string;
  messages: LLMMessage[];
  userId?: string;
  agentId?: string;
  connectedRepos?: string[];
}

export interface AgentRunCallbacks {
  onToken: (text: string) => void;
  onToolStart?: (toolCall: { name: string; args: Record<string, unknown> }) => void;
  onToolEnd?: (result: { name: string; result: string; isError: boolean }) => void;
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
  const tools: ToolDefinition[] = [];
  const customToolDocs: { name: string; description: string; parametersSchema: string; executeCode: string }[] = [];
  const connectedRepos = [...(config.connectedRepos || [])];

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
        }
      }
      if (customToolDocs.length > 0) {
        tools.push(...getCustomToolDefinitions(customToolDocs));
      }
    } catch {
      // Skip
    }

    // Load connected repos from agent doc if not provided
    if (connectedRepos.length === 0) {
      try {
        const agentSnap = await adminDb
          .doc(`users/${config.userId}/agents/${config.agentId}`)
          .get();
        if (agentSnap.exists) {
          const agentData = agentSnap.data()!;
          if (agentData.connectedRepos?.length) {
            connectedRepos.push(...agentData.connectedRepos);
          }
        }
      } catch {
        // Skip
      }
    }
  }

  // Check agent's builtinTools for special capabilities
  let hasBugManagement = false;
  let hasGitHubWrite = false;
  if (config.userId && config.agentId) {
    try {
      const agentSnap = await adminDb.doc(`users/${config.userId}/agents/${config.agentId}`).get();
      const builtinTools: string[] = agentSnap.data()?.builtinTools || [];
      hasBugManagement = builtinTools.includes("bug_management");
      hasGitHubWrite = builtinTools.includes("github_write");
    } catch {
      // Skip
    }
  }

  // GitHub tools (with write access if agent has github_write builtin)
  if (connectedRepos.length > 0) {
    tools.push(...getGithubTools(connectedRepos, hasGitHubWrite));
  }

  // Bug management tools
  if (hasBugManagement) {
    tools.push(...getBugTools());
  }

  const toolCtx: ToolExecutionContext = {
    userId: config.userId || "",
    connectedRepos,
    customTools: customToolDocs,
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

  // Token tracking
  const inputText = config.systemPrompt + messages.map((m) =>
    typeof m.content === "string" ? m.content : JSON.stringify(m.content)
  ).join(" ");
  let inputTokens = estimateTokens(inputText);
  let outputTokens = 0;

  const runIteration = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const pendingToolCalls: ToolCallResult[] = [];

      streamLLM(
        {
          provider: config.provider,
          model: config.model,
          systemPrompt: config.systemPrompt,
          messages,
          tools: tools.length > 0 ? tools : undefined,
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
            fireExtension("tool_call_start", { toolName: toolCall.name, args: toolCall.input }).catch(() => {});
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
                  const result = isBugTool(tc.name)
                    ? await executeBugTool(tc.name, tc.input, config.userId || "")
                    : await executeTool(tc, toolCtx);
                  // Count tool result tokens as additional input
                  inputTokens += estimateTokens(result.result);
                  callbacks.onToolEnd?.({
                    name: tc.name,
                    result: result.result.slice(0, 500),
                    isError: result.isError,
                  });
                  fireExtension(result.isError ? "tool_call_error" : "tool_call_end", {
                    toolName: tc.name,
                    result: result.result.slice(0, 1000),
                    isError: result.isError,
                  }).catch(() => {});
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
                    outputTokens
                  ).catch(() => {}); // Don't block on tracking errors
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
              ).catch(() => {});
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
