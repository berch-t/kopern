import type { LLMMessage } from "@/lib/llm/client";

/**
 * Default content budget: 100K chars (~25K tokens).
 * Tool results larger than this are truncated before sending to LLM.
 * The full result stays in the original messages[] array for session persistence.
 */
const DEFAULT_MAX_TOOL_RESULT_CHARS = 100_000;

/**
 * Truncate tool results that exceed the content budget.
 * Prevents context overflow from verbose tool outputs (web_fetch, code_interpreter, etc.).
 *
 * The original messages are NOT mutated — a new array is returned.
 * This means full results are preserved in the session (Firestore observability)
 * while the LLM only sees the truncated version.
 */
export function truncateToolResults(
  messages: LLMMessage[],
  maxChars: number = DEFAULT_MAX_TOOL_RESULT_CHARS
): LLMMessage[] {
  return messages.map((m) => {
    // Tool results in Kopern are embedded as tool_result blocks in user messages (Anthropic format)
    if (Array.isArray(m.content)) {
      const truncated = m.content.map((block) => {
        if (
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "tool_result" &&
          "content" in block &&
          typeof block.content === "string" &&
          block.content.length > maxChars
        ) {
          const totalChars = block.content.length;
          const estimatedTokens = Math.floor(totalChars / 4);
          return {
            ...block,
            content:
              block.content.slice(0, maxChars) +
              `\n\n[Output truncated: ${totalChars.toLocaleString()} chars (~${estimatedTokens.toLocaleString()} tokens). Only the first ${maxChars.toLocaleString()} chars shown.]`,
          };
        }
        return block;
      });
      return { ...m, content: truncated };
    }

    return m;
  });
}
