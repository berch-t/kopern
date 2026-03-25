// API Key Rotation — in-memory cooldown + retry logic for rate-limited keys

const cooldownCache = new Map<string, number>();

export function isKeyAvailable(key: string): boolean {
  const until = cooldownCache.get(key) ?? 0;
  return Date.now() > until;
}

export function cooldownKey(key: string, durationMs: number = 60_000): void {
  cooldownCache.set(key, Date.now() + durationMs);
}

export function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("429") ||
    msg.includes("rate_limit") ||
    msg.includes("overloaded") ||
    msg.includes("capacity") ||
    msg.includes("too many requests")
  );
}

export async function executeWithKeyRotation<T>(
  keys: string[],
  execute: (key: string) => Promise<T>,
  onRetry?: (failedKey: string, attempt: number, error: unknown) => void
): Promise<T> {
  const available = keys.filter(isKeyAvailable);
  const toTry = available.length > 0 ? available : keys; // if all in cooldown, try anyway
  let lastError: unknown;

  for (let i = 0; i < toTry.length; i++) {
    try {
      return await execute(toTry[i]);
    } catch (error) {
      lastError = error;
      cooldownKey(toTry[i]);
      if (!isRetryableError(error) || i + 1 >= toTry.length) break;
      onRetry?.(toTry[i], i + 1, error);
    }
  }

  throw lastError;
}
