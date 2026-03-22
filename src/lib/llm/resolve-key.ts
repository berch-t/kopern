// Shared helper to resolve LLM API keys from user Firestore settings + env var fallback
// Used by all API routes and autoresearch modules

import { adminDb } from "@/lib/firebase/admin";

/** Provider → env var name mapping */
const PROVIDER_ENV_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_AI_API_KEY",
  mistral: "MISTRAL_API_KEY",
};

/** Check if a key looks like a real API key (not empty, not a placeholder) */
function isValidKey(key: string | undefined | null): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.length < 8) return false;
  if (/^(your|sk-xxx|test|placeholder|TODO)/i.test(trimmed)) return false;
  return true;
}

/**
 * Resolve the API key for a given provider from user Firestore keys or env vars.
 * Returns undefined if no key is available (Ollama doesn't need one).
 */
export async function resolveProviderKey(userId: string, provider: string): Promise<string | undefined> {
  // Ollama doesn't use API keys
  if (provider === "ollama") return undefined;

  // Try user Firestore keys first
  try {
    const userSnap = await adminDb.doc(`users/${userId}`).get();
    if (userSnap.exists) {
      const userKeys = userSnap.data()?.apiKeys || {};
      if (isValidKey(userKeys[provider])) return userKeys[provider];
    }
  } catch {
    // Fall through to env
  }

  // Fallback to env var
  const envVar = PROVIDER_ENV_MAP[provider];
  if (envVar && isValidKey(process.env[envVar])) return process.env[envVar];

  return undefined;
}
