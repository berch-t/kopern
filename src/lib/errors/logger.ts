import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { ErrorSeverity, ErrorSource } from "@/lib/firebase/firestore";

interface LogErrorParams {
  /** Error code (e.g. "PLAN_LIMIT_EXCEEDED", "SLACK_DELIVERY_FAILED") */
  code: string;
  /** Human-readable message */
  message: string;
  /** Source module */
  source: ErrorSource;
  /** Severity — defaults to "error" */
  severity?: ErrorSeverity;
  /** User ID (if known) */
  userId?: string | null;
  /** Agent ID (if applicable) */
  agentId?: string | null;
  /** Additional context (stack, request body, etc.) */
  metadata?: Record<string, unknown>;
  /** Whether the user was notified about this error */
  userNotified?: boolean;
}

/**
 * Log an error to Firestore `errorLogs/` collection.
 * Fire-and-forget — never throws, never blocks the caller.
 */
export function logAppError(params: LogErrorParams): void {
  const {
    code,
    message,
    source,
    severity = "error",
    userId = null,
    agentId = null,
    metadata = {},
    userNotified = false,
  } = params;

  // Also log to console for server-side visibility
  const prefix = `[${source.toUpperCase()}]`;
  if (severity === "critical") {
    console.error(`${prefix} CRITICAL — ${code}: ${message}`, metadata);
  } else if (severity === "error") {
    console.error(`${prefix} ${code}: ${message}`, metadata);
  } else {
    console.warn(`${prefix} ${code}: ${message}`, metadata);
  }

  // Write to Firestore (fire-and-forget)
  adminDb
    .collection("errorLogs")
    .add({
      code,
      message,
      source,
      severity,
      userId,
      agentId,
      metadata: sanitizeMetadata(metadata),
      userNotified,
      createdAt: FieldValue.serverTimestamp(),
    })
    .catch((err) => {
      // Last resort — if even logging fails, just console.error
      console.error("[ErrorLogger] Failed to write error log to Firestore:", err);
    });
}

/**
 * Sanitize metadata to ensure Firestore compatibility.
 * Removes undefined values, converts Error objects to strings.
 */
function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    if (value instanceof Error) {
      clean[key] = { message: value.message, stack: value.stack?.slice(0, 1000) };
    } else if (typeof value === "object" && value !== null) {
      try {
        // Ensure it's JSON-serializable
        clean[key] = JSON.parse(JSON.stringify(value));
      } catch {
        clean[key] = String(value);
      }
    } else {
      clean[key] = value;
    }
  }
  return clean;
}
