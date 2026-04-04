import { describe, it, expect } from "vitest";
import { microCompactMessages } from "../micro-compact";
import type { LLMMessage } from "@/lib/llm/client";

// Helper to build a tool call + result pair
function makeToolPair(
  toolId: string,
  toolName: string,
  resultContent: string
): LLMMessage[] {
  return [
    {
      role: "assistant",
      content: [
        { type: "tool_use", id: toolId, name: toolName, input: {} },
      ],
    },
    {
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: toolId, content: resultContent },
      ],
    },
  ];
}

describe("microCompactMessages", () => {
  it("does nothing when fewer tool results than preserveLastN", () => {
    const messages: LLMMessage[] = [
      { role: "user", content: "Hello" },
      ...makeToolPair("t1", "web_fetch", "result 1"),
      ...makeToolPair("t2", "web_fetch", "result 2"),
    ];
    const { messages: result, tokensFreed } = microCompactMessages(messages, 3);
    expect(tokensFreed).toBe(0);
    expect(result).toBe(messages); // Same reference, no copy
  });

  it("compacts old tool results, keeps last N intact", () => {
    const messages: LLMMessage[] = [
      { role: "user", content: "Start" },
      ...makeToolPair("t1", "web_fetch", "A".repeat(1000)),
      ...makeToolPair("t2", "web_fetch", "B".repeat(1000)),
      ...makeToolPair("t3", "web_fetch", "C".repeat(1000)),
      ...makeToolPair("t4", "web_fetch", "D".repeat(1000)),
    ];

    const { messages: result, tokensFreed } = microCompactMessages(messages, 2);

    // t1 and t2 should be compacted (indices 2 and 4 are the user msgs with tool_result)
    const t1Result = (result[2].content as Array<{ content?: string }>)[0];
    const t2Result = (result[4].content as Array<{ content?: string }>)[0];
    expect(t1Result.content).toBe("[Previous tool output cleared]");
    expect(t2Result.content).toBe("[Previous tool output cleared]");

    // t3 and t4 should be preserved (last 2)
    const t3Result = (result[6].content as Array<{ content?: string }>)[0];
    const t4Result = (result[8].content as Array<{ content?: string }>)[0];
    expect(t3Result.content).toBe("C".repeat(1000));
    expect(t4Result.content).toBe("D".repeat(1000));

    expect(tokensFreed).toBeGreaterThan(0);
  });

  it("does not compact non-compactable tools (write tools)", () => {
    const messages: LLMMessage[] = [
      { role: "user", content: "Start" },
      ...makeToolPair("t1", "send_email", "Email sent OK — " + "x".repeat(300)),
      ...makeToolPair("t2", "remember", "Stored key=value — " + "y".repeat(300)),
      ...makeToolPair("t3", "web_fetch", "fetched data — " + "z".repeat(300)),
      ...makeToolPair("t4", "web_fetch", "more data — " + "w".repeat(300)),
    ];

    const { messages: result } = microCompactMessages(messages, 1);

    // send_email and remember are NOT compactable — should stay intact even in compact zone
    const t1Result = (result[2].content as Array<{ content?: string }>)[0];
    const t2Result = (result[4].content as Array<{ content?: string }>)[0];
    expect(t1Result.content).toContain("Email sent OK");
    expect(t2Result.content).toContain("Stored key=value");

    // t3 (web_fetch, in compact zone, >200 chars) should be compacted
    const t3Result = (result[6].content as Array<{ content?: string }>)[0];
    expect(t3Result.content).toBe("[Previous tool output cleared]");

    // t4 (last 1) should be preserved
    const t4Result = (result[8].content as Array<{ content?: string }>)[0];
    expect(t4Result.content).toContain("more data");
  });

  it("does not compact very short tool results", () => {
    const messages: LLMMessage[] = [
      { role: "user", content: "Start" },
      ...makeToolPair("t1", "web_fetch", "OK"), // < 200 chars
      ...makeToolPair("t2", "web_fetch", "Also OK"),
      ...makeToolPair("t3", "web_fetch", "X".repeat(500)),
      ...makeToolPair("t4", "web_fetch", "Y".repeat(500)),
    ];

    const { messages: result } = microCompactMessages(messages, 2);

    // t1 and t2 are in the compact zone but < 200 chars → should NOT be cleared
    const t1Result = (result[2].content as Array<{ content?: string }>)[0];
    const t2Result = (result[4].content as Array<{ content?: string }>)[0];
    expect(t1Result.content).toBe("OK");
    expect(t2Result.content).toBe("Also OK");
  });

  it("does not compact already-compacted results", () => {
    const messages: LLMMessage[] = [
      { role: "user", content: "Start" },
      ...makeToolPair("t1", "web_fetch", "[Previous tool output cleared]"),
      ...makeToolPair("t2", "web_fetch", "B".repeat(1000)),
      ...makeToolPair("t3", "web_fetch", "C".repeat(1000)),
      ...makeToolPair("t4", "web_fetch", "D".repeat(1000)),
    ];

    const { messages: result, tokensFreed } = microCompactMessages(messages, 2);

    // t1 was already cleared — should stay as is, NOT counted in tokensFreed
    const t1Result = (result[2].content as Array<{ content?: string }>)[0];
    expect(t1Result.content).toBe("[Previous tool output cleared]");
  });

  it("does not mutate original messages", () => {
    const originalContent = "X".repeat(1000);
    const messages: LLMMessage[] = [
      { role: "user", content: "Start" },
      ...makeToolPair("t1", "web_fetch", originalContent),
      ...makeToolPair("t2", "web_fetch", "keep this"),
    ];

    const { messages: result } = microCompactMessages(messages, 1);

    // Original should be untouched
    const originalBlock = (messages[2].content as Array<{ content?: string }>)[0];
    expect(originalBlock.content).toBe(originalContent);

    // Compacted copy should be different
    const compactedBlock = (result[2].content as Array<{ content?: string }>)[0];
    expect(compactedBlock.content).toBe("[Previous tool output cleared]");
  });

  it("preserves non-tool messages in the correct positions", () => {
    // Structure: [0]=Hello, [1]=Hi!, [2]=assistant_t1, [3]=user_t1, [4]=Thanks, [5]=assistant_t2, [6]=user_t2
    const messages: LLMMessage[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi!" },
      ...makeToolPair("t1", "web_fetch", "A".repeat(1000)),
      { role: "user", content: "Thanks" },
      ...makeToolPair("t2", "web_fetch", "B".repeat(1000)),
    ];

    const { messages: result } = microCompactMessages(messages, 1);

    // Non-tool messages should be preserved
    expect(result[0].content).toBe("Hello");
    expect(result[1].content).toBe("Hi!");
    expect(result[4].content).toBe("Thanks");
  });
});
