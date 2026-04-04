// Bluesky auth — App Password based (not OAuth2)
// POST: connect (validate credentials + store encrypted)
// DELETE: disconnect

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { encrypt } from "@/lib/crypto/encrypt";
import { resolveSession, getProfile, DEFAULT_DAILY_LIMITS } from "@/lib/services/social-provider";
import { getAuth } from "firebase-admin/auth";

async function getAuthUser(request: NextRequest): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUser(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { handle, appPassword } = await request.json();
  if (!handle || !appPassword) {
    return NextResponse.json({ error: "Missing handle or appPassword" }, { status: 400 });
  }

  // Validate credentials by creating a session
  try {
    const session = await resolveSession("bluesky", JSON.stringify({ handle, appPassword }));
    const profile = await getProfile("bluesky", session);

    // Store encrypted credentials
    const credentialsJson = JSON.stringify({ handle, appPassword });
    await adminDb.doc(`users/${userId}/socialConnectors/bluesky`).set({
      platform: "bluesky",
      authType: "app_password",
      credentials: encrypt(credentialsJson),
      handle: profile.handle || handle,
      displayName: profile.displayName || handle,
      platformUserId: session.did,
      enabled: true,
      dailyPostCount: 0,
      dailyPostDate: new Date().toISOString().slice(0, 10),
      dailyPostLimit: DEFAULT_DAILY_LIMITS.bluesky,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Bluesky authentication failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthUser(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await adminDb.doc(`users/${userId}/socialConnectors/bluesky`).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to disconnect: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
