// List social media connectors for the authenticated user

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import type { SocialConnectorDoc } from "@/lib/firebase/firestore";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let userId: string;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const snap = await adminDb.collection(`users/${userId}/socialConnectors`).get();
  const connectors = snap.docs.map((doc) => {
    const d = doc.data() as SocialConnectorDoc;
    return {
      platform: d.platform,
      handle: d.handle,
      displayName: d.displayName,
      enabled: d.enabled,
      dailyPostCount: d.dailyPostCount || 0,
      dailyPostLimit: d.dailyPostLimit || 30,
      dailyPostDate: d.dailyPostDate || "",
    };
  });

  return NextResponse.json({ connectors });
}
