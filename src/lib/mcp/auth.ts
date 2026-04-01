import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

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

/** User-level key: not bound to a specific agent. Used for platform-wide MCP tools (list_templates, grade_prompt, list_agents). */
export interface ResolvedUserKey {
  userId: string;
  enabled: boolean;
  rateLimitPerMinute: number;
}

/**
 * Resolve a user-level API key (not bound to any agent).
 * Returns null if the key is agent-bound — use resolveApiKey() for those.
 */
export async function resolveUserApiKey(plainKey: string): Promise<ResolvedUserKey | null> {
  if (!plainKey.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKey(plainKey);
  const snap = await adminDb.collection("apiKeys").doc(hash).get();

  if (!snap.exists) return null;

  const data = snap.data()!;

  // Only user-level keys (no agentId)
  if (data.agentId) return null;

  // Check expiration
  if (data.expiresAt) {
    const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (expiresAt < new Date()) return null;
  }

  // Update lastUsedAt (fire-and-forget)
  adminDb.collection("apiKeys").doc(hash).update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});

  return {
    userId: data.userId,
    enabled: data.enabled,
    rateLimitPerMinute: data.rateLimitPerMinute,
  };
}

/** Resolve an agent-bound API key. Returns null for user-level keys. */
export async function resolveApiKey(plainKey: string): Promise<ResolvedKey | null> {
  if (!plainKey.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKey(plainKey);
  const snap = await adminDb.collection("apiKeys").doc(hash).get();

  if (!snap.exists) return null;

  const data = snap.data()!;

  // Check expiration
  if (data.expiresAt) {
    const expiresAt = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (expiresAt < new Date()) return null;
  }

  // Update lastUsedAt (fire-and-forget)
  adminDb.collection("apiKeys").doc(hash).update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {});

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
  rateLimitPerMinute: number,
  expiresAt?: Date | null
) {
  const hash = hashApiKey(plainKey);

  await adminDb
    .collection("apiKeys")
    .doc(hash)
    .set({
      userId,
      agentId,
      mcpServerId,
      enabled: true,
      rateLimitPerMinute,
      expiresAt: expiresAt || null,
      lastUsedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });

  return { hash, prefix: getKeyPrefix(plainKey) };
}

export async function deleteApiKeyDoc(apiKeyHash: string) {
  await adminDb.collection("apiKeys").doc(apiKeyHash).delete();
}

export async function updateApiKeyDoc(
  apiKeyHash: string,
  data: Partial<{ enabled: boolean; rateLimitPerMinute: number; expiresAt: Date | null }>
) {
  await adminDb.collection("apiKeys").doc(apiKeyHash).update(data);
}

/**
 * Rotate an API key: generate new key, disable old one (audit trail).
 */
export async function rotateApiKey(oldKeyHash: string): Promise<{ newKey: string; newHash: string } | null> {
  const oldSnap = await adminDb.collection("apiKeys").doc(oldKeyHash).get();
  if (!oldSnap.exists) return null;
  const oldData = oldSnap.data()!;

  const newKey = generateApiKey();
  const newHash = hashApiKey(newKey);

  // Create new key
  await adminDb.collection("apiKeys").doc(newHash).set({
    userId: oldData.userId,
    agentId: oldData.agentId,
    mcpServerId: oldData.mcpServerId,
    enabled: true,
    rateLimitPerMinute: oldData.rateLimitPerMinute || 60,
    expiresAt: null,
    lastUsedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Disable old key (keep for audit)
  await adminDb.collection("apiKeys").doc(oldKeyHash).update({
    enabled: false,
    rotatedTo: newHash,
    rotatedAt: FieldValue.serverTimestamp(),
  });

  return { newKey, newHash };
}

/**
 * Create a user-level API key (not bound to any agent).
 * Stored in the same apiKeys collection but with agentId: null.
 */
export async function createUserApiKeyDoc(
  plainKey: string,
  userId: string,
  rateLimitPerMinute = 30
) {
  const hash = hashApiKey(plainKey);

  await adminDb
    .collection("apiKeys")
    .doc(hash)
    .set({
      userId,
      agentId: null,
      mcpServerId: null,
      type: "user",
      enabled: true,
      rateLimitPerMinute,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });

  return { hash, prefix: getKeyPrefix(plainKey) };
}
