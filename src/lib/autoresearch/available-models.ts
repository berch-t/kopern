// Resolve which models are actually available based on configured API keys
// Checks BOTH user Firestore keys (settings page) and server env vars
// Used by evolution, tournament, and distillation to avoid testing unreachable models

import { adminDb } from "@/lib/firebase/admin";
export { resolveProviderKey } from "@/lib/llm/resolve-key";

export interface AvailableModel {
  provider: string;
  model: string;
  name: string;
}

/** Provider → env var name mapping */
const PROVIDER_ENV_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_AI_API_KEY",
  mistral: "MISTRAL_API_KEY",
};

/** All models per provider */
const PROVIDER_MODELS: Record<string, { model: string; name: string }[]> = {
  anthropic: [
    { model: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { model: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    { model: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  ],
  openai: [
    { model: "gpt-5.4", name: "GPT-5.4" },
    { model: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
    { model: "gpt-5.3-codex", name: "GPT-5.3 Codex" },
    { model: "o4-mini", name: "o4 Mini" },
    { model: "o3", name: "o3" },
    { model: "gpt-4.1", name: "GPT-4.1" },
    { model: "gpt-4o", name: "GPT-4o" },
    { model: "gpt-4o-mini", name: "GPT-4o Mini" },
  ],
  google: [
    { model: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { model: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { model: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  ],
  mistral: [
    { model: "mistral-large-latest", name: "Mistral Large 3" },
    { model: "magistral-medium-latest", name: "Magistral Medium" },
    { model: "mistral-small-latest", name: "Mistral Small 4" },
    { model: "codestral-latest", name: "Codestral" },
  ],
  ollama: [
    { model: "llama3.3", name: "Llama 3.3 (70B)" },
    { model: "deepseek-r1", name: "DeepSeek R1" },
  ],
};

/** Check if a key looks like a real API key (not empty, not a placeholder) */
function isValidKey(key: string | undefined | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 8) return false;
  if (/^(your|sk-xxx|test|placeholder|TODO)/i.test(trimmed)) return false;
  return true;
}

/** Cached Ollama reachability (reset per process) */
let ollamaReachable: boolean | null = null;

/**
 * Load available models by checking BOTH user Firestore keys AND server env vars.
 * A provider is available if either source has a valid key for it.
 */
export async function getAvailableModelsForUser(userId: string): Promise<AvailableModel[]> {
  // Load user API keys from Firestore
  let userKeys: Record<string, string> = {};
  try {
    const userSnap = await adminDb.doc(`users/${userId}`).get();
    if (userSnap.exists) {
      userKeys = userSnap.data()?.apiKeys || {};
    }
  } catch {
    // Fall through to env-only check
  }

  const available: AvailableModel[] = [];

  for (const [provider, envVar] of Object.entries(PROVIDER_ENV_MAP)) {
    const hasUserKey = isValidKey(userKeys[provider]);
    const hasEnvKey = isValidKey(process.env[envVar]);

    if (hasUserKey || hasEnvKey) {
      for (const m of PROVIDER_MODELS[provider]) {
        available.push({ provider, model: m.model, name: m.name });
      }
    }
  }

  // Ollama: needs reachability check (no API key, just URL)
  if (process.env.OLLAMA_BASE_URL && ollamaReachable === true) {
    for (const m of PROVIDER_MODELS.ollama) {
      available.push({ provider: "ollama", model: m.model, name: m.name });
    }
  }

  return available;
}

/**
 * Sync version that only checks env vars (for non-async contexts).
 * Prefer getAvailableModelsForUser() in async contexts.
 */
export function getAvailableModels(): AvailableModel[] {
  const available: AvailableModel[] = [];

  for (const [provider, envVar] of Object.entries(PROVIDER_ENV_MAP)) {
    if (isValidKey(process.env[envVar])) {
      for (const m of PROVIDER_MODELS[provider]) {
        available.push({ provider, model: m.model, name: m.name });
      }
    }
  }

  if (process.env.OLLAMA_BASE_URL && ollamaReachable === true) {
    for (const m of PROVIDER_MODELS.ollama) {
      available.push({ provider: "ollama", model: m.model, name: m.name });
    }
  }

  return available;
}

/**
 * Ping Ollama to check if it's running. Caches result for the process lifetime.
 * Call this once before using getAvailableModels/ForUser() in autoresearch flows.
 */
export async function checkOllamaReachable(): Promise<boolean> {
  if (ollamaReachable !== null) return ollamaReachable;

  const baseUrl = process.env.OLLAMA_BASE_URL;
  if (!baseUrl) {
    ollamaReachable = false;
    return false;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    ollamaReachable = resp.ok;
  } catch {
    ollamaReachable = false;
  }

  return ollamaReachable;
}


/**
 * Get available student models for distillation (cheaper than the teacher).
 * Excludes the teacher model and prefers smaller/cheaper variants.
 */
export async function getAvailableStudentModels(
  userId: string,
  teacherProvider: string,
  teacherModel: string
): Promise<{ provider: string; model: string; label: string }[]> {
  const all = await getAvailableModelsForUser(userId);
  return all
    .filter((m) => m.model !== teacherModel || m.provider !== teacherProvider)
    .map((m) => ({ provider: m.provider, model: m.model, label: m.name }));
}
