// Micro-compaction: replace old tool results with a short marker
// Keeps the last N tool results intact so the LLM has recent context
// Dramatically reduces token usage in long multi-tool sessions

import type { LLMMessage, ContentBlock } from "@/lib/llm/client";
import { estimateTokens } from "@/lib/billing/pricing";

const CLEARED_MESSAGE = "[Previous tool output cleared]";

/**
 * Tools whose results are safe to compact (typically large read outputs).
 * Write tool results are kept intact (they contain confirmation/error info the LLM needs).
 */
const COMPACTABLE_TOOLS = new Set([
  "web_fetch",
  "read_file",
  "search_files",
  "code_interpreter",
  "read_emails",
  "list_events",
  "check_availability",
  "social_read_feed",
  "social_search_mentions",
  "social_get_metrics",
  "social_get_profile",
  "recall",
  "search_sessions",
]);

/**
 * Find the tool name for a tool_result block by looking at the preceding
 * assistant message's tool_use blocks.
 */
function findToolName(
  messages: LLMMessage[],
  toolUseId: string
): string | null {
  for (const msg of messages) {
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "tool_use" && block.id === toolUseId) {
          return block.name || null;
        }
      }
    }
  }
  return null;
}

interface MicroCompactResult {
  messages: LLMMessage[];
  tokensFreed: number;
}

/**
 * Replace old tool results with a short marker to free context tokens.
 *
 * - Only compacts tools in COMPACTABLE_TOOLS (read-heavy tools)
 * - Keeps the last `preserveLastN` tool result messages intact
 * - Returns a NEW array (does not mutate the original)
 *
 * @param messages - conversation messages
 * @param preserveLastN - number of recent tool-result-bearing messages to keep (default 3)
 */
export function microCompactMessages(
  messages: LLMMessage[],
  preserveLastN = 3
): MicroCompactResult {
  // Find indices of user messages that contain tool_result blocks
  const toolResultMsgIndices: number[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user" && Array.isArray(msg.content)) {
      const hasToolResult = (msg.content as ContentBlock[]).some(
        (b) => b.type === "tool_result"
      );
      if (hasToolResult) {
        toolResultMsgIndices.push(i);
      }
    }
  }

  // Nothing to compact if we have fewer tool result messages than the preserve count
  if (toolResultMsgIndices.length <= preserveLastN) {
    return { messages, tokensFreed: 0 };
  }

  // Indices to compact (all except the last N)
  const toCompactIndices = new Set(
    toolResultMsgIndices.slice(0, -preserveLastN)
  );

  let tokensFreed = 0;

  const result = messages.map((msg, idx) => {
    if (!toCompactIndices.has(idx)) return msg;

    // Compact tool_result blocks inside this user message
    const compactedContent = (msg.content as ContentBlock[]).map((block) => {
      if (block.type !== "tool_result" || typeof block.content !== "string") {
        return block;
      }

      // Only compact known compactable tools
      const toolName = findToolName(messages, block.tool_use_id || "");
      if (toolName && !COMPACTABLE_TOOLS.has(toolName)) {
        return block;
      }

      // Skip if already compacted or very short
      if (
        block.content === CLEARED_MESSAGE ||
        block.content.length < 200
      ) {
        return block;
      }

      tokensFreed += estimateTokens(block.content);
      return { ...block, content: CLEARED_MESSAGE };
    });

    return { ...msg, content: compactedContent };
  });

  return { messages: result, tokensFreed };
}
