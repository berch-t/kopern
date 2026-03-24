import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.vercel.app";

/**
 * POST /api/whatsapp/setup — Connect WhatsApp to a Kopern agent
 * Body: { phoneNumberId, accessToken, verifyToken, phoneNumber, userId, agentId }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phoneNumberId, accessToken, verifyToken, phoneNumber, userId, agentId } = body;

  if (!phoneNumberId || !accessToken || !userId || !agentId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Verify the access token works by calling the API
    const testRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!testRes.ok) {
      return NextResponse.json(
        { error: "Invalid access token — could not verify with Meta API" },
        { status: 400 }
      );
    }

    // Store connector doc
    await adminDb
      .doc(`users/${userId}/agents/${agentId}/connectors/whatsapp`)
      .set({
        phoneNumberId,
        accessToken,
        verifyToken: verifyToken || "",
        phoneNumber: phoneNumber || "",
        enabled: true,
        installedBy: userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    // Store top-level index for O(1) lookup
    await adminDb.doc(`whatsappPhones/${phoneNumberId}`).set({
      userId,
      agentId,
    });

    return NextResponse.json({
      ok: true,
      webhookUrl: `${SITE_URL}/api/whatsapp/webhook`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Setup failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/setup — Disconnect WhatsApp
 * Body: { userId, agentId }
 */
export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { userId, agentId } = body;

  if (!userId || !agentId) {
    return NextResponse.json({ error: "Missing userId or agentId" }, { status: 400 });
  }

  try {
    const snap = await adminDb
      .doc(`users/${userId}/agents/${agentId}/connectors/whatsapp`)
      .get();

    if (snap.exists) {
      const data = snap.data()!;
      const phoneNumberId = data.phoneNumberId as string;

      if (phoneNumberId) {
        await adminDb.doc(`whatsappPhones/${phoneNumberId}`).delete();
      }

      await adminDb.doc(`users/${userId}/agents/${agentId}/connectors/whatsapp`).delete();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Disconnect failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
