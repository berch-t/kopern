// Tool approval policy — EU AI Act Art. 14 human oversight

export type ApprovalPolicy = "auto" | "confirm_destructive" | "confirm_all";
export type ApprovalDecision = "approved" | "denied";

/** Builtin tools considered destructive (write operations, external side effects) */
const DESTRUCTIVE_BUILTIN_TOOLS = new Set([
  "create_branch",
  "commit_files",
  "create_pull_request",
  "send_thank_you_email",
  "update_bug_status",
  // Service connector write operations
  "send_email",
  "reply_email",
  "create_event",
  "update_event",
  "cancel_event",
]);

export function isDestructiveBuiltin(toolName: string): boolean {
  return DESTRUCTIVE_BUILTIN_TOOLS.has(toolName);
}

export function requiresApproval(
  policy: ApprovalPolicy,
  toolName: string,
  isDestructive: boolean
): boolean {
  if (policy === "auto") return false;
  if (policy === "confirm_all") return true;
  if (policy === "confirm_destructive" && isDestructive) return true;
  return false;
}

export interface ApprovalRequest {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  isDestructive: boolean;
}

/**
 * Creates a promise that resolves when an approval decision is received,
 * or auto-denies after timeout.
 */
export function createApprovalGate(timeoutMs: number = 120_000) {
  let resolve: (decision: ApprovalDecision) => void;

  const promise = new Promise<ApprovalDecision>((res) => {
    resolve = res;
  });

  const timer = setTimeout(() => {
    resolve!("denied");
  }, timeoutMs);

  return {
    promise,
    respond(decision: ApprovalDecision) {
      clearTimeout(timer);
      resolve!(decision);
    },
  };
}
