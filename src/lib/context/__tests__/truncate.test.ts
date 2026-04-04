import { describe, it, expect } from "vitest";
import { truncateToolResults } from "../truncate";
import type { LLMMessage } from "@/lib/llm/client";

describe("truncateToolResults (content budget)", () => {
  it("does not truncate small tool results", () => {
    const messages: LLMMessage[] = [
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "t1", content: "short result" },
        ],
      },
    ];
    const result = truncateToolResults(messages);
    const block = (result[0].content as Array<{ content?: string }>)[0];
    expect(block.content).toBe("short result");
  });

  it("truncates tool results exceeding 100K chars by default", () => {
    const longContent = "x".repeat(150_000);
    const messages: LLMMessage[] = [
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "t1", content: longContent },
        ],
      },
    ];
    const result = truncateToolResults(messages);
    const block = (result[0].content as Array<{ content?: string }>)[0];
    expect(block.content!.length).toBeLessThan(longContent.length);
    expect(block.content).toContain("[Output truncated:");
    expect(block.content).toContain("150,000 chars");
  });

  it("does not mutate original messages", () => {
    const longContent = "y".repeat(200_000);
    const messages: LLMMessage[] = [
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "t1", content: longContent },
        ],
      },
    ];
    const result = truncateToolResults(messages);
    // Original should be unchanged
    const originalBlock = (messages[0].content as Array<{ content?: string }>)[0];
    expect(originalBlock.content).toBe(longContent);
    // Truncated copy should be shorter
    const truncatedBlock = (result[0].content as Array<{ content?: string }>)[0];
    expect(truncatedBlock.content!.length).toBeLessThan(longContent.length);
  });

  it("respects custom maxChars parameter", () => {
    const content = "z".repeat(5000);
    const messages: LLMMessage[] = [
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "t1", content },
        ],
      },
    ];
    const result = truncateToolResults(messages, 1000);
    const block = (result[0].content as Array<{ content?: string }>)[0];
    expect(block.content).toContain("[Output truncated:");
    // First 1000 chars should be intact
    expect(block.content!.startsWith("z".repeat(1000))).toBe(true);
  });

  it("passes through non-tool-result messages unchanged", () => {
    const messages: LLMMessage[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ];
    const result = truncateToolResults(messages);
    expect(result[0].content).toBe("Hello");
    expect(result[1].content).toBe("Hi there");
  });

  it("handles mixed content blocks (text + tool_result)", () => {
    const longContent = "a".repeat(200_000);
    const messages: LLMMessage[] = [
      {
        role: "user",
        content: [
          { type: "text", text: "Here are the results:" },
          { type: "tool_result", tool_use_id: "t1", content: longContent },
          { type: "tool_result", tool_use_id: "t2", content: "short" },
        ],
      },
    ];
    const result = truncateToolResults(messages);
    const blocks = result[0].content as Array<{ type: string; content?: string; text?: string }>;
    // Text block untouched
    expect(blocks[0].text).toBe("Here are the results:");
    // Long tool_result truncated
    expect(blocks[1].content).toContain("[Output truncated:");
    // Short tool_result untouched
    expect(blocks[2].content).toBe("short");
  });
});
