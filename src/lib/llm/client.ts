// Multi-provider LLM streaming client

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMStreamCallbacks {
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export interface LLMConfig {
  provider: string;
  model: string;
  systemPrompt: string;
  messages: LLMMessage[];
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

// --- Anthropic ---

async function streamAnthropic(config: LLMConfig, callbacks: LLMStreamCallbacks) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    callbacks.onError(new Error("ANTHROPIC_API_KEY not configured in .env.local"));
    return;
  }

  const messages = config.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: config.systemPrompt || undefined,
      messages,
      stream: true,
    }),
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
          if (event.type === "content_block_delta" && event.delta?.text) {
            callbacks.onToken(event.delta.text);
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone();
}

// --- OpenAI ---

async function streamOpenAI(config: LLMConfig, callbacks: LLMStreamCallbacks) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    callbacks.onError(new Error("OPENAI_API_KEY not configured in .env.local"));
    return;
  }

  const messages: { role: string; content: string }[] = [];
  if (config.systemPrompt) {
    messages.push({ role: "system", content: config.systemPrompt });
  }
  for (const m of config.messages) {
    if (m.role !== "system") {
      messages.push({ role: m.role, content: m.content });
    }
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
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
          const delta = event.choices?.[0]?.delta?.content;
          if (delta) {
            callbacks.onToken(delta);
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone();
}

// --- Google Gemini ---

async function streamGoogle(config: LLMConfig, callbacks: LLMStreamCallbacks) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    callbacks.onError(new Error("GOOGLE_AI_API_KEY not configured in .env.local"));
    return;
  }

  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const m of config.messages) {
    if (m.role === "system") continue;
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }

  const body: Record<string, unknown> = { contents };
  if (config.systemPrompt) {
    body.systemInstruction = { parts: [{ text: config.systemPrompt }] };
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
          const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            callbacks.onToken(text);
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone();
}

// --- Ollama (local) ---

async function streamOllama(config: LLMConfig, callbacks: LLMStreamCallbacks) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  const messages: { role: string; content: string }[] = [];
  if (config.systemPrompt) {
    messages.push({ role: "system", content: config.systemPrompt });
  }
  for (const m of config.messages) {
    if (m.role !== "system") {
      messages.push({ role: m.role, content: m.content });
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

  callbacks.onDone();
}
