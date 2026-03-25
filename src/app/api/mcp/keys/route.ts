import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  generateApiKey,
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

// Create a new MCP server + API key
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { agentId, name, description = "", rateLimitPerMinute = 60 } = body as {
    agentId: string;
    name: string;
    description?: string;
    rateLimitPerMinute?: number;
  };

  if (!agentId || !name) {
    return NextResponse.json({ error: "agentId and name are required" }, { status: 400 });
  }

  // Verify user owns the agent
  const agentSnap = await adminDb
    .collection("users")
    .doc(user.uid)
    .collection("agents")
    .doc(agentId)
    .get();

  if (!agentSnap.exists) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Generate key
  const plainKey = generateApiKey();
  const { hash, prefix } = await createApiKeyDocs(
    plainKey,
    user.uid,
    agentId,
    "", // placeholder — will update after creating the server doc
    rateLimitPerMinute
  );

  // Create MCP server doc
  const serverRef = await adminDb
    .collection("users")
    .doc(user.uid)
    .collection("agents")
    .doc(agentId)
    .collection("mcpServers")
    .add({
      name,
      description,
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
      enabled: true,
      rateLimitPerMinute,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  // Update apiKeys index with the actual serverId
  await adminDb.collection("apiKeys").doc(hash).update({
    mcpServerId: serverRef.id,
  });

  return NextResponse.json({
    serverId: serverRef.id,
    apiKey: plainKey, // shown once
    apiKeyPrefix: prefix,
  });
}

// Delete an MCP server + its API key
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  const serverId = searchParams.get("serverId");

  if (!agentId || !serverId) {
    return NextResponse.json({ error: "agentId and serverId required" }, { status: 400 });
  }

  const serverRef = adminDb
    .collection("users")
    .doc(user.uid)
    .collection("agents")
    .doc(agentId)
    .collection("mcpServers")
    .doc(serverId);

  const serverSnap = await serverRef.get();
  if (!serverSnap.exists) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const serverData = serverSnap.data()!;

  // Delete API key index
  await deleteApiKeyDoc(serverData.apiKeyHash);

  // Delete server doc
  await serverRef.delete();

  return NextResponse.json({ success: true });
}

// Regenerate API key for existing server
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { agentId, serverId } = body as { agentId: string; serverId: string };

  if (!agentId || !serverId) {
    return NextResponse.json({ error: "agentId and serverId required" }, { status: 400 });
  }

  const serverRef = adminDb
    .collection("users")
    .doc(user.uid)
    .collection("agents")
    .doc(agentId)
    .collection("mcpServers")
    .doc(serverId);

  const serverSnap = await serverRef.get();
  if (!serverSnap.exists) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  const serverData = serverSnap.data()!;

  // Rotate: disable old key (audit trail) + create new key
  const rotated = await rotateApiKey(serverData.apiKeyHash);
  if (!rotated) {
    return NextResponse.json({ error: "Failed to rotate key" }, { status: 500 });
  }

  const newPrefix = getKeyPrefix(rotated.newKey);

  // Update server doc with new hash/prefix
  await serverRef.update({
    apiKeyHash: rotated.newHash,
    apiKeyPrefix: newPrefix,
    updatedAt: new Date(),
  });

  return NextResponse.json({
    apiKey: rotated.newKey, // shown once
    apiKeyPrefix: newPrefix,
  });
}
