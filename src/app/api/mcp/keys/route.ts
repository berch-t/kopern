import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  createApiKeyDocs,
  deleteApiKeyDoc,
  rotateApiKey,
} from "@/lib/mcp/auth";

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return await adminAuth.verifyIdToken(authHeader.slice(7));
  } catch {
    return null;
  }
}

// List API keys for an agent
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "agentId required" }, { status: 400 });
  }

  // Query all enabled keys for this agent
  const snap = await adminDb
    .collection("apiKeys")
    .where("userId", "==", user.uid)
    .where("agentId", "==", agentId)
    .get();

  const keys = snap.docs
    .filter((d) => {
      const data = d.data();
      // Exclude rotated-away keys
      return !data.rotatedTo;
    })
    .map((d) => {
      const data = d.data();
      return {
        hash: d.id,
        prefix: data.apiKeyPrefix || data.mcpServerId ? getKeyPrefix(`kpn_${d.id.slice(0, 8)}`) : "kpn_••••",
        enabled: data.enabled ?? true,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
        lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

  return NextResponse.json({ keys });
}

// Create a new API key for an agent
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { agentId } = body as { agentId: string };

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  // Verify user owns the agent
  const agentSnap = await adminDb.doc(`users/${user.uid}/agents/${agentId}`).get();
  if (!agentSnap.exists) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Generate key
  const plainKey = generateApiKey();
  const prefix = getKeyPrefix(plainKey);
  const hash = hashApiKey(plainKey);

  await adminDb.collection("apiKeys").doc(hash).set({
    userId: user.uid,
    agentId,
    mcpServerId: null,
    apiKeyPrefix: prefix,
    enabled: true,
    rateLimitPerMinute: 30,
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date(),
  });

  // Also create legacy mcpServers doc for backward compatibility
  await adminDb
    .collection(`users/${user.uid}/agents/${agentId}/mcpServers`)
    .doc(hash.slice(0, 20))
    .set({
      name: "API Key",
      description: "",
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
      enabled: true,
      rateLimitPerMinute: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  return NextResponse.json({
    apiKey: plainKey, // shown once
    apiKeyPrefix: prefix,
    keyHash: hash,
  });
}

// Delete an API key
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  const keyHash = searchParams.get("keyHash");

  if (!agentId || !keyHash) {
    return NextResponse.json({ error: "agentId and keyHash required" }, { status: 400 });
  }

  // Verify ownership
  const keySnap = await adminDb.collection("apiKeys").doc(keyHash).get();
  if (!keySnap.exists) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }
  const keyData = keySnap.data()!;
  if (keyData.userId !== user.uid || keyData.agentId !== agentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete key
  await deleteApiKeyDoc(keyHash);

  // Clean up legacy mcpServers doc if exists
  if (keyData.mcpServerId) {
    await adminDb
      .doc(`users/${user.uid}/agents/${agentId}/mcpServers/${keyData.mcpServerId}`)
      .delete()
      .catch(() => {});
  }

  return NextResponse.json({ success: true });
}

// Rotate an API key
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { agentId, keyHash } = body as { agentId: string; keyHash: string };

  if (!agentId || !keyHash) {
    return NextResponse.json({ error: "agentId and keyHash required" }, { status: 400 });
  }

  // Verify ownership
  const keySnap = await adminDb.collection("apiKeys").doc(keyHash).get();
  if (!keySnap.exists) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }
  const keyData = keySnap.data()!;
  if (keyData.userId !== user.uid || keyData.agentId !== agentId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rotate: disable old key (audit trail) + create new key
  const rotated = await rotateApiKey(keyHash);
  if (!rotated) {
    return NextResponse.json({ error: "Failed to rotate key" }, { status: 500 });
  }

  const newPrefix = getKeyPrefix(rotated.newKey);

  // Store prefix on new key doc
  await adminDb.collection("apiKeys").doc(rotated.newHash).update({
    apiKeyPrefix: newPrefix,
  });

  return NextResponse.json({
    apiKey: rotated.newKey, // shown once
    apiKeyPrefix: newPrefix,
    keyHash: rotated.newHash,
  });
}
