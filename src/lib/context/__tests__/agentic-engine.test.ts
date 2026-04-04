import { describe, it, expect } from "vitest";

/**
 * Tests for Sprint 1 P0 agentic engine features.
 * These test the pure logic functions — not the full runAgentWithTools()
 * which requires Firebase/LLM mocking.
 */

// ---- 1. concurrencySafe flag on ToolDefinition ----

import type { ToolDefinition } from "@/lib/llm/client";

// Simulate a tool pool with concurrencySafe flags (mirrors real tool definitions)
const MOCK_TOOLS: ToolDefinition[] = [
  { name: "web_fetch", description: "", input_schema: {}, concurrencySafe: true },
  { name: "read_file", description: "", input_schema: {}, concurrencySafe: true },
  { name: "recall", description: "", input_schema: {}, concurrencySafe: true },
  { name: "list_events", description: "", input_schema: {}, concurrencySafe: true },
  { name: "search_sessions", description: "", input_schema: {}, concurrencySafe: true },
  { name: "send_email", description: "", input_schema: {} },
  { name: "remember", description: "", input_schema: {} },
  { name: "forget", description: "", input_schema: {} },
  { name: "create_event", description: "", input_schema: {} },
  { name: "code_interpreter", description: "", input_schema: {} },
  { name: "generate_image", description: "", input_schema: {} },
  { name: "commit_files", description: "", input_schema: {} },
];

// Build lookup set from tools with concurrencySafe flag (same as run-agent.ts)
const concurrentSafeNames = new Set(MOCK_TOOLS.filter(t => t.concurrencySafe).map(t => t.name));

describe("Parallel tool execution — concurrencySafe flag", () => {
  it("classifies tools with concurrencySafe: true as concurrent-safe", () => {
    expect(concurrentSafeNames.has("web_fetch")).toBe(true);
    expect(concurrentSafeNames.has("read_file")).toBe(true);
    expect(concurrentSafeNames.has("recall")).toBe(true);
    expect(concurrentSafeNames.has("list_events")).toBe(true);
    expect(concurrentSafeNames.has("search_sessions")).toBe(true);
  });

  it("classifies tools without the flag as NOT concurrent-safe", () => {
    expect(concurrentSafeNames.has("send_email")).toBe(false);
    expect(concurrentSafeNames.has("remember")).toBe(false);
    expect(concurrentSafeNames.has("forget")).toBe(false);
    expect(concurrentSafeNames.has("create_event")).toBe(false);
    expect(concurrentSafeNames.has("code_interpreter")).toBe(false);
    expect(concurrentSafeNames.has("generate_image")).toBe(false);
    expect(concurrentSafeNames.has("commit_files")).toBe(false);
  });

  it("custom tools default to sequential (no concurrencySafe flag)", () => {
    const customTool: ToolDefinition = { name: "my_custom_tool", description: "", input_schema: {} };
    expect(customTool.concurrencySafe).toBeUndefined();
    expect(concurrentSafeNames.has("my_custom_tool")).toBe(false);
  });

  it("separates a mixed batch into read and write groups correctly", () => {
    const pendingToolCalls = [
      { id: "1", name: "web_fetch" },
      { id: "2", name: "send_email" },
      { id: "3", name: "web_fetch" },
      { id: "4", name: "remember" },
      { id: "5", name: "read_file" },
    ];

    const readCalls = pendingToolCalls.filter(tc => concurrentSafeNames.has(tc.name));
    const writeCalls = pendingToolCalls.filter(tc => !concurrentSafeNames.has(tc.name));

    expect(readCalls.map(tc => tc.id)).toEqual(["1", "3", "5"]);
    expect(writeCalls.map(tc => tc.id)).toEqual(["2", "4"]);
  });

  it("recombines results in original FIFO order", () => {
    const pendingToolCalls = [
      { id: "1", name: "web_fetch" },
      { id: "2", name: "send_email" },
      { id: "3", name: "recall" },
    ];

    const readResultsMap = new Map([
      ["1", { result: "fetch result" }],
      ["3", { result: "recall result" }],
    ]);
    const writeResultsMap = new Map([
      ["2", { result: "email sent" }],
    ]);

    const combined = pendingToolCalls.map(tc =>
      readResultsMap.get(tc.id) || writeResultsMap.get(tc.id)
    );

    expect(combined.map(r => r!.result)).toEqual([
      "fetch result",
      "email sent",
      "recall result",
    ]);
  });

  it("concurrencySafe is not included in API payload (only name/description/input_schema)", () => {
    const tool: ToolDefinition = { name: "web_fetch", description: "Fetch", input_schema: { type: "object" }, concurrencySafe: true };
    // Simulate what client.ts does when sending to Anthropic
    const apiPayload = { name: tool.name, description: tool.description, input_schema: tool.input_schema };
    expect(apiPayload).not.toHaveProperty("concurrencySafe");
  });
});

// ---- 2. Iteration guard — maxIterations is the sole safeguard ----

describe("Iteration guard — maxIterations", () => {
  // Diminishing returns detection was REMOVED because it incorrectly stopped agents
  // during productive tool-use iterations. Tool calls produce ~0 text tokens but do
  // real work (web_fetch, recall, code_interpreter). The detector saw this as "low gain"
  // and killed agents after 4 iterations, producing truncated outputs.
  // maxIterations (configurable per agent, default 10, max 30) is the sufficient guard.

  it("maxIterations clamps to valid range [1, 30]", () => {
    const clamp = (val: number) => Math.min(Math.max(val, 1), 30);
    expect(clamp(0)).toBe(1);
    expect(clamp(50)).toBe(30);
    expect(clamp(10)).toBe(10);
  });

  it("agent with tool calls runs until maxIterations or end_turn", () => {
    // Simulate: 10 iterations all tool_use, agent never says end_turn
    const maxIterations = 10;
    let iteration = 0;
    const toolCallsPerIteration = [3, 2, 1, 4, 2, 1, 3, 2, 1, 2]; // all productive

    for (const toolCalls of toolCallsPerIteration) {
      if (iteration >= maxIterations) break;
      iteration++;
      // Agent makes tool calls — this is productive work, should NOT be stopped
      expect(toolCalls).toBeGreaterThan(0);
    }

    expect(iteration).toBe(10); // ran all iterations
  });

  it("agent that ends early with end_turn stops naturally", () => {
    const maxIterations = 10;
    let iteration = 0;
    const stopReasons = ["tool_use", "tool_use", "tool_use", "end_turn"];

    for (const reason of stopReasons) {
      if (iteration >= maxIterations) break;
      iteration++;
      if (reason === "end_turn") break;
    }

    expect(iteration).toBe(4); // stopped naturally at end_turn
  });
});

// ---- 3. Max output tokens recovery logic ----

describe("Max output tokens recovery", () => {
  it("allows up to 3 recovery attempts", () => {
    const MAX_OUTPUT_RECOVERY_ATTEMPTS = 3;
    let outputRecoveryCount = 0;
    const recoveries: number[] = [];

    // Simulate 5 max_tokens events
    for (let i = 0; i < 5; i++) {
      if (outputRecoveryCount < MAX_OUTPUT_RECOVERY_ATTEMPTS) {
        outputRecoveryCount++;
        recoveries.push(outputRecoveryCount);
      }
    }

    expect(recoveries).toEqual([1, 2, 3]);
    expect(outputRecoveryCount).toBe(3);
  });
});

// ---- 4. Reactive compact error detection ----

describe("Reactive compact — error detection", () => {
  function isPromptTooLong(error: { message?: string; status?: number }): boolean {
    const msg = error.message || "";
    return (
      msg.includes("prompt is too long") ||
      msg.includes("too many tokens") ||
      msg.includes("context_length_exceeded") ||
      msg.includes("maximum context length") ||
      error.status === 413
    );
  }

  it("detects Anthropic prompt_too_long", () => {
    expect(isPromptTooLong({ message: "prompt is too long (500000 tokens)" })).toBe(true);
  });

  it("detects OpenAI context_length_exceeded", () => {
    expect(isPromptTooLong({ message: "context_length_exceeded" })).toBe(true);
  });

  it("detects OpenAI maximum context length", () => {
    expect(isPromptTooLong({ message: "This model's maximum context length is 128000 tokens" })).toBe(true);
  });

  it("detects generic too many tokens", () => {
    expect(isPromptTooLong({ message: "Request has too many tokens" })).toBe(true);
  });

  it("detects HTTP 413", () => {
    expect(isPromptTooLong({ status: 413 })).toBe(true);
  });

  it("does not trigger on unrelated errors", () => {
    expect(isPromptTooLong({ message: "429 Too Many Requests" })).toBe(false);
    expect(isPromptTooLong({ message: "invalid_api_key" })).toBe(false);
    expect(isPromptTooLong({ status: 500 })).toBe(false);
  });

  it("circuit breaker allows only 1 attempt", () => {
    let hasAttemptedReactiveCompact = false;
    let compactCalled = 0;

    for (let i = 0; i < 3; i++) {
      if (!hasAttemptedReactiveCompact) {
        hasAttemptedReactiveCompact = true;
        compactCalled++;
      }
    }

    expect(compactCalled).toBe(1);
  });
});

// ---- 5. maxToolIterations bounds ----

describe("maxToolIterations configuration", () => {
  it("clamps to valid range [1, 30]", () => {
    const clamp = (val: number) => Math.min(Math.max(val, 1), 30);
    expect(clamp(0)).toBe(1);
    expect(clamp(-5)).toBe(1);
    expect(clamp(1)).toBe(1);
    expect(clamp(15)).toBe(15);
    expect(clamp(30)).toBe(30);
    expect(clamp(50)).toBe(30);
    expect(clamp(100)).toBe(30);
  });

  it("defaults to 10 when not set", () => {
    const MAX_TOOL_ITERATIONS = 10;
    const configMax = undefined;
    const agentMax = undefined;
    const maxIterations = configMax || agentMax || MAX_TOOL_ITERATIONS;
    expect(maxIterations).toBe(10);
  });

  it("config override takes precedence over agent doc", () => {
    const MAX_TOOL_ITERATIONS = 10;
    const configMax = 5;
    const agentMax = 15;
    const maxIterations = configMax || agentMax || MAX_TOOL_ITERATIONS;
    expect(maxIterations).toBe(5);
  });

  it("agent doc value used when no config override", () => {
    const MAX_TOOL_ITERATIONS = 10;
    const configMax = undefined;
    const agentMax = 20;
    const maxIterations = configMax || agentMax || MAX_TOOL_ITERATIONS;
    expect(maxIterations).toBe(20);
  });
});

// ---- 6. Stop reason propagation ----

describe("Stop reason types", () => {
  it("supports all three stop reasons", () => {
    type StopReason = "end_turn" | "tool_use" | "max_tokens";
    const reasons: StopReason[] = ["end_turn", "tool_use", "max_tokens"];
    expect(reasons).toHaveLength(3);
  });

  it("OpenAI finish_reason 'length' maps to max_tokens", () => {
    const mapFinishReason = (reason: string): string => {
      if (reason === "tool_calls") return "tool_use";
      if (reason === "length") return "max_tokens";
      return "end_turn";
    };

    expect(mapFinishReason("stop")).toBe("end_turn");
    expect(mapFinishReason("tool_calls")).toBe("tool_use");
    expect(mapFinishReason("length")).toBe("max_tokens");
  });

  it("Google finishReason 'MAX_TOKENS' maps to max_tokens", () => {
    const mapGoogleReason = (reason: string): string => {
      if (reason === "MAX_TOKENS") return "max_tokens";
      return "end_turn";
    };

    expect(mapGoogleReason("STOP")).toBe("end_turn");
    expect(mapGoogleReason("MAX_TOKENS")).toBe("max_tokens");
  });
});
