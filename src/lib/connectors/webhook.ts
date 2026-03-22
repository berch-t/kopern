import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { WebhookEventType, WebhookLogDoc } from "@/lib/firebase/firestore";
import { logAppError } from "@/lib/errors/logger";

// ─── HMAC Signature ──────────────────────────────────────────────────

export function computeHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacSignature(payload: string, secret: string, signature: string): boolean {
  const expected = computeHmacSignature(payload, secret);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ─── Webhook Logging ─────────────────────────────────────────────────

export async function logWebhookExecution(
  userId: string,
  agentId: string,
  log: Omit<WebhookLogDoc, "createdAt">
): Promise<void> {
  const truncated = {
    ...log,
    requestBody: log.requestBody.slice(0, 2000),
    responseBody: log.responseBody.slice(0, 2000),
    createdAt: FieldValue.serverTimestamp(),
  };

  await adminDb
    .collection(`users/${userId}/agents/${agentId}/webhookLogs`)
    .add(truncated);
}

// ─── Send Outbound Webhook ───────────────────────────────────────────

export async function sendWebhook(
  targetUrl: string,
  payload: Record<string, unknown>,
  secret?: string | null
): Promise<{ statusCode: number; responseBody: string; durationMs: number }> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    headers["X-Webhook-Signature"] = computeHmacSignature(body, secret);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const start = Date.now();

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    const responseBody = await res.text();
    return {
      statusCode: res.status,
      responseBody,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      statusCode: 0,
      responseBody: err instanceof Error ? err.message : "Unknown error",
      durationMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Fire Outbound Webhooks ──────────────────────────────────────────

export async function fireOutboundWebhooks(
  userId: string,
  agentId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const snap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/webhooks`)
    .where("type", "==", "outbound")
    .where("enabled", "==", true)
    .get();

  const webhooks = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as { events?: string[]; targetUrl?: string; secret?: string }) }))
    .filter(
      (w) =>
        Array.isArray(w.events) &&
        w.events.includes(event) &&
        typeof w.targetUrl === "string" &&
        w.targetUrl.length > 0
    );

  const payload = {
    event,
    agentId,
    timestamp: new Date().toISOString(),
    data,
  };

  await Promise.allSettled(
    webhooks.map(async (wh) => {
      try {
        const result = await sendWebhook(
          wh.targetUrl as string,
          payload,
          (wh.secret as string) || null
        );

        await logWebhookExecution(userId, agentId, {
          webhookId: wh.id,
          direction: "outbound",
          status: result.statusCode >= 200 && result.statusCode < 300 ? "success" : "error",
          statusCode: result.statusCode,
          requestBody: JSON.stringify(payload),
          responseBody: result.responseBody,
          durationMs: result.durationMs,
        });
      } catch (err) {
        await logWebhookExecution(userId, agentId, {
          webhookId: wh.id,
          direction: "outbound",
          status: "error",
          statusCode: null,
          requestBody: JSON.stringify(payload),
          responseBody: err instanceof Error ? err.message : "Unknown error",
          durationMs: 0,
        }).catch((logErr) => logAppError({ code: "WEBHOOK_OUTBOUND_LOG_FAILED", message: (logErr as Error).message, source: "webhook_outbound", userId, agentId }));
      }
    })
  );
}
