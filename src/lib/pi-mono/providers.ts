// Static provider/model list for the MVP
// In production, this would query pi-ai's getModel() dynamically

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  supportsThinking: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
}

export const providers: ProviderInfo[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", contextWindow: 1000000, supportsThinking: true },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", contextWindow: 1000000, supportsThinking: true },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", contextWindow: 200000, supportsThinking: true },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-5.4", name: "GPT-5.4", contextWindow: 1050000, supportsThinking: false },
      { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", contextWindow: 1050000, supportsThinking: false },
      { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", contextWindow: 1050000, supportsThinking: false },
      { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", contextWindow: 400000, supportsThinking: false },
      { id: "gpt-5.3-chat", name: "GPT-5.3 Chat", contextWindow: 128000, supportsThinking: false },
      { id: "o4-mini", name: "o4 Mini", contextWindow: 200000, supportsThinking: true },
      { id: "o3", name: "o3", contextWindow: 200000, supportsThinking: true },
      { id: "gpt-4.1", name: "GPT-4.1", contextWindow: 1000000, supportsThinking: false },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", contextWindow: 1000000, supportsThinking: false },
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, supportsThinking: false },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, supportsThinking: false },
    ],
  },
  {
    id: "google",
    name: "Google",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, supportsThinking: true },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000, supportsThinking: true },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000, supportsThinking: true },
    ],
  },
  {
    id: "mistral",
    name: "Mistral AI",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large 3", contextWindow: 262000, supportsThinking: false },
      { id: "magistral-medium-latest", name: "Magistral Medium", contextWindow: 40000, supportsThinking: true },
      { id: "mistral-medium-latest", name: "Mistral Medium 3.1", contextWindow: 131000, supportsThinking: false },
      { id: "mistral-small-latest", name: "Mistral Small 4", contextWindow: 128000, supportsThinking: false },
      { id: "codestral-latest", name: "Codestral", contextWindow: 256000, supportsThinking: false },
      { id: "devstral-medium-latest", name: "Devstral 2 Medium", contextWindow: 256000, supportsThinking: false },
      { id: "devstral-small-latest", name: "Devstral Small 1.1", contextWindow: 131000, supportsThinking: false },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    models: [
      { id: "llama3.3", name: "Llama 3.3 (70B)", contextWindow: 128000, supportsThinking: false },
      { id: "llama3.2", name: "Llama 3.2 (3B)", contextWindow: 128000, supportsThinking: false },
      { id: "devstral-small-2", name: "Devstral 24B", contextWindow: 380000, supportsThinking: false },
      { id: "codellama", name: "Code Llama", contextWindow: 16000, supportsThinking: false },
      { id: "deepseek-r1", name: "DeepSeek R1", contextWindow: 64000, supportsThinking: true },
      { id: "qwq:latest", name: "QWQ", contextWindow: 32000, supportsThinking: false },
      { id: "phi4", name: "Phi-4 (14B)", contextWindow: 16000, supportsThinking: false },
      { id: "gemma2", name: "Gemma 2 (9B)", contextWindow: 8000, supportsThinking: false },
    ],
  },
];

export function getProviderModels(providerId: string): ModelInfo[] {
  return providers.find((p) => p.id === providerId)?.models ?? [];
}

export function getModelInfo(providerId: string, modelId: string): ModelInfo | undefined {
  return getProviderModels(providerId).find((m) => m.id === modelId);
}

export const thinkingLevels = [
  { value: "off", label: "Off" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra High" },
] as const;
