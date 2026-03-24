// In-memory approval gate registry for pending tool approvals.
// The SSE chat stream stays open while waiting for approval,
// and the client POSTs the decision to /api/agents/[agentId]/approve.
// Both run in the same serverless instance during the request lifecycle.

import { createApprovalGate, type ApprovalDecision } from "./approval";

const pendingGates = new Map<string, { respond: (d: ApprovalDecision) => void; createdAt: number }>();

/** Register a gate and return the promise that resolves on decision or timeout */
export function registerApprovalGate(toolCallId: string, timeoutMs = 120_000) {
  const gate = createApprovalGate(timeoutMs);

  pendingGates.set(toolCallId, { respond: gate.respond, createdAt: Date.now() });

  // Cleanup on resolve (either decision or timeout)
  gate.promise.then(() => {
    pendingGates.delete(toolCallId);
  });

  return gate.promise;
}

/** Resolve a pending gate with a decision */
export function resolveApprovalGate(toolCallId: string, decision: ApprovalDecision): boolean {
  const gate = pendingGates.get(toolCallId);
  if (!gate) return false;
  gate.respond(decision);
  return true;
}

/** Cleanup stale gates (safety net, called periodically if needed) */
export function cleanupStaleGates(maxAgeMs = 300_000) {
  const now = Date.now();
  for (const [id, gate] of pendingGates) {
    if (now - gate.createdAt > maxAgeMs) {
      gate.respond("denied");
      pendingGates.delete(id);
    }
  }
}
