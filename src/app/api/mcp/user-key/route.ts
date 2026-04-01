import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  generateApiKey,
  getKeyPrefix,
  hashApiKey,
  createUserApiKeyDoc,
  deleteApiKeyDoc,
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

// Create a user-level API key (not bound to any agent)
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has a user-level key — limit to 1
  const existing = await adminDb
    .collection("apiKeys")
    .where("userId", "==", user.uid)
    .where("type", "==", "user")
    .where("enabled", "==", true)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json(
      { error: "You already have a personal API key. Delete it first to generate a new one." },
      { status: 409 }
    );
  }

  const plainKey = generateApiKey();
  const { hash, prefix } = await createUserApiKeyDoc(plainKey, user.uid);

  return NextResponse.json({
    apiKey: plainKey, // shown once
    apiKeyPrefix: prefix,
    apiKeyHash: hash,
  });
}

// Delete user-level API key
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyHash = searchParams.get("hash");

  if (!keyHash) {
    return NextResponse.json({ error: "hash query param required" }, { status: 400 });
  }

  // Verify ownership
  const snap = await adminDb.collection("apiKeys").doc(keyHash).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }
  const data = snap.data()!;
  if (data.userId !== user.uid || data.type !== "user") {
    return NextResponse.json({ error: "Not your key" }, { status: 403 });
  }

  await deleteApiKeyDoc(keyHash);

  return NextResponse.json({ success: true });
}

// Get current user-level key info (prefix only, not the full key)
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snap = await adminDb
    .collection("apiKeys")
    .where("userId", "==", user.uid)
    .where("type", "==", "user")
    .where("enabled", "==", true)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json({ exists: false });
  }

  const doc = snap.docs[0];
  const data = doc.data();

  return NextResponse.json({
    exists: true,
    apiKeyPrefix: data.apiKeyPrefix || getKeyPrefix("kpn_" + doc.id.slice(0, 8)),
    apiKeyHash: doc.id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString() || null,
  });
}
