// Context compaction — summarize old messages when conversation grows too long
// Uses a cheap model (Haiku/Flash) to compress older conversation history

import { estimateTokens } from "@/lib/billing/pricing";
import type { LLMMessage } from "@/lib/llm/client";

const RECENT_TURNS_TO_KEEP = 4; // Keep last 4 user-assistant pairs
const MAX_SUMMARY_INPUT_CHARS = 50_000;

const COMPACTION_SYSTEM_PROMPT = `You are a conversation summarizer. Your job is to create a concise summary of a conversation between a user and an AI assistant.

Rules:
- Preserve ALL key facts: names, numbers, dates, prices, decisions, commitments
- Preserve the user's intent and any pending questions
- Preserve tool call results and their outcomes
- Be concise but complete — nothing important should be lost
- Write in the same language as the conversation
- Use bullet points for clarity
- Maximum 500 words`;

/**
 * Check if messages exceed the compaction threshold.
 */
export function shouldCompact(messages: LLMMessage[], thresholdTokens: number): boolean {
  const totalText = messages
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join(" ");
  return estimateTokens(totalText) > thresholdTokens;
}

/**
 * Compact older messages into a summary, keeping recent turns intact.
 * Uses Haiku (cheapest model) for summarization.
 */
export async function compactMessages(
  messages: LLMMessage[],
  apiKey?: string,
  apiKeys?: string[]
): Promise<{ messages: LLMMessage[]; tokensBefore: number; tokensAfter: number }> {
  const totalText = messages
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join(" ");
  const tokensBefore = estimateTokens(totalText);

  // Find split point: keep last N pairs of messages
  const keepCount = RECENT_TURNS_TO_KEEP * 2; // user + assistant = 1 pair
  if (messages.length <= keepCount + 1) {
    // Not enough messages to compact
    return { messages, tokensBefore, tokensAfter: tokensBefore };
  }

  const oldMessages = messages.slice(0, messages.length - keepCount);
  const recentMessages = messages.slice(messages.length - keepCount);

  // Build conversation text for summarization
  const conversationText = oldMessages
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      const content = typeof m.content === "string"
        ? m.content
        : m.content
            .map((b) => {
              if (b.type === "text") return b.text || "";
              if (b.type === "tool_use") return `[Tool: ${b.name}(${JSON.stringify(b.input).slice(0, 200)})]`;
              if (b.type === "tool_result") return `[Tool result: ${(b.content || "").slice(0, 300)}]`;
              return "";
            })
            .filter(Boolean)
            .join("\n");
      return `${role}: ${content}`;
    })
    .join("\n\n")
    .slice(0, MAX_SUMMARY_INPUT_CHARS);

  // Call Haiku for summarization
  try {
    const { streamLLM } = await import("@/lib/llm/client");

    let summary = "";
    await new Promise<void>((resolve, reject) => {
      streamLLM(
        {
          provider: "anthropic",
          model: "claude-haiku-4-5-20251001",
          systemPrompt: COMPACTION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Summarize this conversation:\n\n${conversationText}`,
            },
          ],
          maxTokens: 1024,
          apiKey,
          apiKeys,
        },
        {
          onToken: (text) => {
            summary += text;
          },
          onToolCall: () => {},
          onDone: () => resolve(),
          onError: (err) => reject(err),
        }
      );
    });

    if (!summary.trim()) {
      return { messages, tokensBefore, tokensAfter: tokensBefore };
    }

    // Build compacted message array
    const compactedMessages: LLMMessage[] = [
      {
        role: "user",
        content: `[Context from earlier in this conversation]\n${summary.trim()}`,
      },
      {
        role: "assistant",
        content: "I understand the context from our earlier conversation. I'll use this to continue helping you.",
      },
      ...recentMessages,
    ];

    const afterText = compactedMessages
      .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
      .join(" ");
    const tokensAfter = estimateTokens(afterText);

    return { messages: compactedMessages, tokensBefore, tokensAfter };
  } catch {
    // If compaction fails, return original messages
    return { messages, tokensBefore, tokensAfter: tokensBefore };
  }
}
