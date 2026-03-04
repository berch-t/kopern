import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";

const KEY_PREFIX = "kpn_";

export function generateApiKey(): string {
  return KEY_PREFIX + crypto.randomBytes(32).toString("hex");
}

export function hashApiKey(plainKey: string): string {
  return crypto.createHash("sha256").update(plainKey).digest("hex");
}

export function getKeyPrefix(plainKey: string): string {
  return plainKey.slice(0, 12);
}

export interface ResolvedKey {
  userId: string;
  agentId: string;
  mcpServerId: string;
  enabled: boolean;
  rateLimitPerMinute: number;
}

export async function resolveApiKey(plainKey: string): Promise<ResolvedKey | null> {
  if (!plainKey.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKey(plainKey);
  const snap = await adminDb.collection("apiKeys").doc(hash).get();

  if (!snap.exists) return null;

  const data = snap.data()!;
  return {
    userId: data.userId,
    agentId: data.agentId,
    mcpServerId: data.mcpServerId,
    enabled: data.enabled,
    rateLimitPerMinute: data.rateLimitPerMinute,
  };
}

export async function createApiKeyDocs(
  plainKey: string,
  userId: string,
  agentId: string,
  mcpServerId: string,
  rateLimitPerMinute: number
) {
  const hash = hashApiKey(plainKey);
  const now = new Date();

  await adminDb
    .collection("apiKeys")
    .doc(hash)
    .set({
      userId,
      agentId,
      mcpServerId,
      enabled: true,
      rateLimitPerMinute,
      createdAt: now,
    });

  return { hash, prefix: getKeyPrefix(plainKey) };
}

export async function deleteApiKeyDoc(apiKeyHash: string) {
  await adminDb.collection("apiKeys").doc(apiKeyHash).delete();
}

export async function updateApiKeyDoc(
  apiKeyHash: string,
  data: Partial<{ enabled: boolean; rateLimitPerMinute: number }>
) {
  await adminDb.collection("apiKeys").doc(apiKeyHash).update(data);
}
