/**
 * Monitor Model Registry — models available per provider for the Monitor dropdown.
 */

export interface ModelOption {
  id: string;
  name: string;
}

export interface ProviderConfig {
  name: string;
  keyPrefix: string;
  placeholder: string;
  models: ModelOption[];
}

export const MONITOR_PROVIDERS: Record<string, ProviderConfig> = {
  anthropic: {
    name: "Anthropic",
    keyPrefix: "sk-ant-",
    placeholder: "sk-ant-api03-...",
    models: [
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5" },
      { id: "claude-opus-4-1", name: "Claude Opus 4.1" },
      { id: "claude-opus-4", name: "Claude Opus 4" },
    ],
  },
  openai: {
    name: "OpenAI",
    keyPrefix: "sk-",
    placeholder: "sk-proj-...",
    models: [
      { id: "gpt-5.2", name: "GPT-5.2" },
      { id: "gpt-5.1", name: "GPT-5.1" },
      { id: "gpt-5", name: "GPT-5" },
      { id: "gpt-5-mini", name: "GPT-5 Mini" },
      { id: "gpt-5-nano", name: "GPT-5 Nano" },
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
      { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "o4-mini", name: "o4-mini" },
      { id: "o3", name: "o3" },
      { id: "o3-mini", name: "o3-mini" },
    ],
  },
  google: {
    name: "Google",
    keyPrefix: "AI",
    placeholder: "AIza...",
    models: [
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro" },
      { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite" },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
      { id: "gemini-2.5-pro-preview-06-05", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash-preview-05-20", name: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    ],
  },
  mistral: {
    name: "Mistral",
    keyPrefix: "",
    placeholder: "Your Mistral API key",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large 3" },
      { id: "devstral-medium-latest", name: "Devstral 2" },
    ],
  },
};

export const PROVIDER_IDS = Object.keys(MONITOR_PROVIDERS);
