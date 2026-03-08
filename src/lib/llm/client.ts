// Multi-provider LLM streaming client with tool calling support

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  // tool_use fields
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  // tool_result fields
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ToolCallResult {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMStreamCallbacks {
  onToken: (text: string) => void;
  onToolCall?: (toolCall: ToolCallResult) => void;
  onDone: (stopReason?: "end_turn" | "tool_use") => void;
  onError: (error: Error) => void;
}

export interface LLMConfig {
  provider: string;
  model: string;
  systemPrompt: string;
  messages: LLMMessage[];
  tools?: ToolDefinition[];
}

/** Resolve tool name from tool_use_id by scanning assistant messages */
function resolveToolName(messages: LLMMessage[], toolUseId?: string): string {
  if (!toolUseId) return "unknown";
  for (const m of messages) {
    if (m.role === "assistant" && Array.isArray(m.content)) {
      for (const block of m.content) {
        if (block.type === "tool_use" && block.id === toolUseId && block.name) {
          return block.name;
        }
      }
    }
  }
  return "unknown";
}

export async function streamLLM(config: LLMConfig, callbacks: LLMStreamCallbacks) {
  switch (config.provider) {
    case "anthropic":
      return streamAnthropic(config, callbacks);
    case "openai":
      return streamOpenAI(config, callbacks);
    case "google":
      return streamGoogle(config, callbacks);
    case "ollama":
      return streamOllama(config, callbacks);
    default:
      callbacks.onError(new Error(`Unknown provider: ${config.provider}`));
  }
}

// --- Anthropic (native tool calling) ---

async function streamAnthropic(config: LLMConfig, callbacks: LLMStreamCallbacks) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    callbacks.onError(new Error("ANTHROPIC_API_KEY not configured in .env.local"));
    return;
  }

  // Flatten messages for Anthropic format
  const messages = config.messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      if (typeof m.content === "string") {
        return { role: m.role, content: m.content };
      }
      // Content blocks (for tool results)
      return { role: m.role, content: m.content };
    });

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: 8192,
    system: config.systemPrompt || undefined,
    messages,
    stream: true,
  };

  if (config.tools && config.tools.length > 0) {
    // Sanitize tool schemas — Anthropic requires type: "object" in input_schema
    body.tools = config.tools.map((t) => ({
      ...t,
      input_schema: {
        type: "object",
        properties: {},
        ...t.input_schema,
      },
    }));
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    callbacks.onError(new Error(`Anthropic API error ${response.status}: ${errorBody}`));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error("No response body from Anthropic"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let stopReason: "end_turn" | "tool_use" = "end_turn";

  // Track current tool call being built
  let currentToolId = "";
  let currentToolName = "";
  let currentToolInput = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data);

          switch (event.type) {
            case "content_block_start":
              if (event.content_block?.type === "tool_use") {
                currentToolId = event.content_block.id;
                currentToolName = event.content_block.name;
                currentToolInput = "";
              }
              break;

            case "content_block_delta":
              if (event.delta?.type === "text_delta" && event.delta.text) {
                callbacks.onToken(event.delta.text);
              } else if (event.delta?.type === "input_json_delta" && event.delta.partial_json) {
                currentToolInput += event.delta.partial_json;
              }
              break;

            case "content_block_stop":
              if (currentToolId && currentToolName) {
                let parsedInput: Record<string, unknown> = {};
                try {
                  parsedInput = JSON.parse(currentToolInput || "{}");
                } catch {
                  parsedInput = {};
                }
                callbacks.onToolCall?.({
                  id: currentToolId,
                  name: currentToolName,
                  input: parsedInput,
                });
                currentToolId = "";
                currentToolName = "";
                currentToolInput = "";
              }
              break;

            case "message_delta":
              if (event.delta?.stop_reason === "tool_use") {
                stopReason = "tool_use";
              }
              break;
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone(stopReason);
}

// --- OpenAI (function calling) ---

async function streamOpenAI(config: LLMConfig, callbacks: LLMStreamCallbacks) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    callbacks.onError(new Error("OPENAI_API_KEY not configured in .env.local"));
    return;
  }

  const messages: Record<string, unknown>[] = [];
  if (config.systemPrompt) {
    messages.push({ role: "system", content: config.systemPrompt });
  }
  for (const m of config.messages) {
    if (m.role === "system") continue;

    if (typeof m.content === "string") {
      messages.push({ role: m.role, content: m.content });
    } else {
      // Convert tool results for OpenAI format
      // OpenAI expects separate tool messages
      for (const block of m.content) {
        if (block.type === "tool_result") {
          messages.push({
            role: "tool",
            tool_call_id: block.tool_use_id,
            content: block.content || "",
          });
        }
      }
    }
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: true,
  };

  if (config.tools && config.tools.length > 0) {
    body.tools = config.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    callbacks.onError(new Error(`OpenAI API error ${response.status}: ${errorBody}`));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error("No response body from OpenAI"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let stopReason: "end_turn" | "tool_use" = "end_turn";

  // Track tool calls being built incrementally
  const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data);
          const choice = event.choices?.[0];
          if (!choice) continue;

          // Text content
          const delta = choice.delta?.content;
          if (delta) {
            callbacks.onToken(delta);
          }

          // Tool calls
          if (choice.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls.has(idx)) {
                toolCalls.set(idx, { id: tc.id || "", name: "", args: "" });
              }
              const entry = toolCalls.get(idx)!;
              if (tc.id) entry.id = tc.id;
              if (tc.function?.name) entry.name = tc.function.name;
              if (tc.function?.arguments) entry.args += tc.function.arguments;
            }
          }

          // Stop reason
          if (choice.finish_reason === "tool_calls") {
            stopReason = "tool_use";
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Emit accumulated tool calls
  for (const [, tc] of toolCalls) {
    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = JSON.parse(tc.args || "{}");
    } catch {
      parsedArgs = {};
    }
    callbacks.onToolCall?.({ id: tc.id, name: tc.name, input: parsedArgs });
    stopReason = "tool_use";
  }

  callbacks.onDone(stopReason);
}

// --- Google Gemini (function calling) ---

async function streamGoogle(config: LLMConfig, callbacks: LLMStreamCallbacks) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    callbacks.onError(new Error("GOOGLE_AI_API_KEY not configured in .env.local"));
    return;
  }

  const contents: Record<string, unknown>[] = [];

  for (const m of config.messages) {
    if (m.role === "system") continue;
    if (typeof m.content === "string") {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    } else {
      // Handle tool_use (assistant) and tool_result (user) for Gemini
      const parts: Record<string, unknown>[] = [];
      for (const block of m.content) {
        if (block.type === "tool_use" && block.name) {
          parts.push({
            functionCall: {
              name: block.name,
              args: block.input || {},
            },
          });
        } else if (block.type === "tool_result") {
          // Resolve name from preceding assistant tool_use blocks
          const toolName = resolveToolName(config.messages, block.tool_use_id);
          parts.push({
            functionResponse: {
              name: toolName,
              response: { result: block.content },
            },
          });
        }
      }
      if (parts.length > 0) {
        const role = m.role === "assistant" ? "model" : "user";
        contents.push({ role, parts });
      }
    }
  }

  const body: Record<string, unknown> = { contents };
  if (config.systemPrompt) {
    body.systemInstruction = { parts: [{ text: config.systemPrompt }] };
  }

  if (config.tools && config.tools.length > 0) {
    body.tools = [
      {
        functionDeclarations: config.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        })),
      },
    ];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    callbacks.onError(new Error(`Google AI error ${response.status}: ${errorBody}`));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error("No response body from Google AI"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let stopReason: "end_turn" | "tool_use" = "end_turn";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();

        try {
          const event = JSON.parse(data);
          const parts = event.candidates?.[0]?.content?.parts;
          if (!parts) continue;

          for (const part of parts) {
            if (part.text) {
              callbacks.onToken(part.text);
            }
            if (part.functionCall) {
              stopReason = "tool_use";
              callbacks.onToolCall?.({
                id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                name: part.functionCall.name,
                input: part.functionCall.args || {},
              });
            }
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone(stopReason);
}

// --- Ollama (local) — no native tool support, text-only ---

async function streamOllama(config: LLMConfig, callbacks: LLMStreamCallbacks) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  const messages: { role: string; content: string }[] = [];
  if (config.systemPrompt) {
    messages.push({ role: "system", content: config.systemPrompt });
  }
  for (const m of config.messages) {
    if (m.role !== "system") {
      messages.push({
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      });
    }
  }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    callbacks.onError(new Error(`Ollama error ${response.status}: ${errorBody}`));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error("No response body from Ollama"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.message?.content) {
            callbacks.onToken(event.message.content);
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone("end_turn");
}
