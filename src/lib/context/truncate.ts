import type { LLMMessage } from "@/lib/llm/client";

const MAX_TOOL_RESULT_CHARS = 4000;

/**
 * Truncate tool results that exceed the max character limit.
 * Prevents context overflow from verbose tool outputs (read_file, search_files, etc.).
 * Pattern inspired by OpenClaw compact.ts — truncate tool results FIRST before any other
 * context reduction strategy.
 */
export function truncateToolResults(
  messages: LLMMessage[],
  maxChars: number = MAX_TOOL_RESULT_CHARS
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
          return {
            ...block,
            content: block.content.slice(0, maxChars) + `\n[... truncated, ${block.content.length} chars total]`,
          };
        }
        return block;
      });
      return { ...m, content: truncated };
    }

    return m;
  });
}
