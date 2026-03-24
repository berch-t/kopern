import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  setTelegramWebhook,
  deleteTelegramWebhook,
  getTelegramBotInfo,
} from "@/lib/connectors/telegram";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.vercel.app";

/**
 * POST /api/telegram/setup — Connect a Telegram bot to a Kopern agent
 * Body: { botToken, userId, agentId }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { botToken, userId, agentId } = body;

  if (!botToken || !userId || !agentId) {
    return NextResponse.json({ error: "Missing botToken, userId, or agentId" }, { status: 400 });
  }

  try {
    // Verify the bot token by calling getMe
    const botInfo = await getTelegramBotInfo(botToken);
    if (!botInfo) {
      return NextResponse.json({ error: "Invalid bot token — could not reach Telegram Bot API" }, { status: 400 });
    }

    // Generate a unique secret token for webhook verification
    const secretToken = crypto.randomBytes(32).toString("hex");
    const secretHash = crypto.createHash("sha256").update(secretToken).digest("hex");

    // Set the webhook on Telegram
    const webhookUrl = `${SITE_URL}/api/telegram/webhook`;
    const result = await setTelegramWebhook(botToken, webhookUrl, secretToken);
    if (!result.ok) {
      return NextResponse.json(
        { error: `Telegram webhook setup failed: ${result.description}` },
        { status: 500 }
      );
    }

    // Store in Firestore — connector doc (user-owned)
    await adminDb
      .doc(`users/${userId}/agents/${agentId}/connectors/telegram`)
      .set({
        botToken,
        botUsername: botInfo.username,
        botFirstName: botInfo.firstName,
        secretHash,
        enabled: true,
        installedBy: userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    // Store top-level index for O(1) webhook lookup
    await adminDb.doc(`telegramBots/${secretHash}`).set({
      userId,
      agentId,
      botToken,
    });

    return NextResponse.json({
      ok: true,
      botUsername: botInfo.username,
      botFirstName: botInfo.firstName,
      webhookUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Setup failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/telegram/setup — Disconnect a Telegram bot
 * Body: { userId, agentId }
 */
export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { userId, agentId } = body;

  if (!userId || !agentId) {
    return NextResponse.json({ error: "Missing userId or agentId" }, { status: 400 });
  }

  try {
    // Load connector doc to get botToken + secretHash
    const snap = await adminDb
      .doc(`users/${userId}/agents/${agentId}/connectors/telegram`)
      .get();

    if (snap.exists) {
      const data = snap.data()!;
      const botToken = data.botToken as string;
      const secretHash = data.secretHash as string;

      // Remove webhook from Telegram
      if (botToken) {
        await deleteTelegramWebhook(botToken);
      }

      // Delete top-level index
      if (secretHash) {
        await adminDb.doc(`telegramBots/${secretHash}`).delete();
      }

      // Delete connector doc
      await adminDb.doc(`users/${userId}/agents/${agentId}/connectors/telegram`).delete();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Disconnect failed: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
