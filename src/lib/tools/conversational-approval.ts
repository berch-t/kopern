/**
 * Conversational approval for headless connectors (Telegram, WhatsApp, Slack).
 * Instead of auto-deny, we send an approval message via the platform's native
 * interactive UI and wait for the user's response with a timeout.
 *
 * Flow:
 * 1. Agent calls a destructive tool → approval gate registers
 * 2. Connector sends a formatted approval request message to the user
 * 3. User replies "yes"/"approve" or "no"/"deny" (or taps a button)
 * 4. Connector resolves the gate → agent continues or gets denial
 * 5. Timeout after 120s → auto-deny
 */

import type { ApprovalDecision } from "./approval";

// ---------------------------------------------------------------------------
// In-memory registry for conversational approval gates
// Key: composite string "connector:chatId:toolCallId"
// ---------------------------------------------------------------------------

interface PendingGate {
  resolve: (decision: ApprovalDecision) => void;
  toolName: string;
  args: Record<string, unknown>;
  createdAt: number;
}

const pendingGates = new Map<string, PendingGate>();

const TIMEOUT_MS = 120_000; // 2 minutes

export function makeGateKey(connector: string, chatId: string, toolCallId: string): string {
  return `${connector}:${chatId}:${toolCallId}`;
}

/**
 * Register a conversational approval gate and return a promise that resolves
 * when the user responds or the timeout expires.
 */
export function registerConversationalGate(
  connector: string,
  chatId: string,
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ApprovalDecision> {
  const key = makeGateKey(connector, chatId, toolCallId);

  return new Promise<ApprovalDecision>((resolve) => {
    pendingGates.set(key, { resolve, toolName, args, createdAt: Date.now() });

    // Auto-deny after timeout
    setTimeout(() => {
      if (pendingGates.has(key)) {
        pendingGates.delete(key);
        resolve("denied");
      }
    }, TIMEOUT_MS);
  });
}

/**
 * Resolve a pending conversational approval gate.
 * Called when the user replies with approval/denial on the messaging platform.
 * Returns true if a gate was found and resolved, false otherwise.
 */
export function resolveConversationalGate(
  connector: string,
  chatId: string,
  decision: ApprovalDecision,
): boolean {
  // Find the most recent pending gate for this chat
  for (const [key, gate] of pendingGates.entries()) {
    if (key.startsWith(`${connector}:${chatId}:`)) {
      gate.resolve(decision);
      pendingGates.delete(key);
      return true;
    }
  }
  return false;
}

/**
 * Check if a user message is an approval response.
 * Supports multiple languages (EN/FR).
 */
export function parseApprovalResponse(message: string): ApprovalDecision | null {
  const lower = message.trim().toLowerCase();
  const approvePatterns = [
    "yes", "oui", "approve", "approuver", "ok", "go", "confirm", "confirmer",
    "accept", "accepter", "valider", "validate", "autoriser", "allow",
  ];
  const denyPatterns = [
    "no", "non", "deny", "refuser", "cancel", "annuler", "reject", "rejeter",
    "block", "bloquer", "stop", "abort",
  ];

  if (approvePatterns.includes(lower)) return "approved";
  if (denyPatterns.includes(lower)) return "denied";
  return null;
}

/**
 * Check if there's a pending approval gate for a given chat.
 */
export function hasPendingGate(connector: string, chatId: string): boolean {
  for (const key of pendingGates.keys()) {
    if (key.startsWith(`${connector}:${chatId}:`)) return true;
  }
  return false;
}

/**
 * Get pending gate info for a chat (for displaying context).
 */
export function getPendingGateInfo(
  connector: string,
  chatId: string,
): { toolName: string; args: Record<string, unknown> } | null {
  for (const [key, gate] of pendingGates.entries()) {
    if (key.startsWith(`${connector}:${chatId}:`)) {
      return { toolName: gate.toolName, args: gate.args };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Format approval request message for each platform
// ---------------------------------------------------------------------------

export function formatApprovalMessage(
  toolName: string,
  args: Record<string, unknown>,
): string {
  const argSummary = Object.entries(args)
    .slice(0, 5) // Limit to 5 args
    .map(([k, v]) => `  ${k}: ${typeof v === "string" ? v.slice(0, 100) : JSON.stringify(v)}`)
    .join("\n");

  return [
    `🔐 **Tool Approval Required**`,
    ``,
    `The agent wants to execute: **${toolName}**`,
    argSummary ? `\nParameters:\n${argSummary}` : "",
    ``,
    `Reply **yes** to approve or **no** to deny.`,
    `_(Auto-denied after 2 minutes)_`,
  ].join("\n");
}

/**
 * Format for Slack (mrkdwn format).
 */
export function formatSlackApprovalMessage(
  toolName: string,
  args: Record<string, unknown>,
): string {
  const argSummary = Object.entries(args)
    .slice(0, 5)
    .map(([k, v]) => `  \`${k}\`: ${typeof v === "string" ? v.slice(0, 100) : JSON.stringify(v)}`)
    .join("\n");

  return [
    `🔐 *Tool Approval Required*`,
    ``,
    `The agent wants to execute: *${toolName}*`,
    argSummary ? `\nParameters:\n${argSummary}` : "",
    ``,
    `Reply *yes* to approve or *no* to deny.`,
    `_(Auto-denied after 2 minutes)_`,
  ].join("\n");
}
