import type { ExtensionEventType } from "@/lib/firebase/firestore";
import { BLOCKING_EVENTS } from "./event-types";

export interface ExtensionContext {
  /** The event type being fired */
  eventType: ExtensionEventType;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** Session state accessible to extensions */
  sessionState: Record<string, unknown>;
}

export interface ExtensionResult {
  /** Whether to block the action (only for blocking events) */
  blocked: boolean;
  /** Optional message explaining why blocked */
  blockReason?: string;
  /** Modified data (extensions can transform event data) */
  modifiedData?: Record<string, unknown>;
  /** Logs/messages from the extension */
  logs: string[];
}

interface RegisteredExtension {
  id: string;
  name: string;
  events: ExtensionEventType[];
  code: string;
  enabled: boolean;
}

/**
 * Runs registered extensions for a given event.
 * Extensions are executed in registration order.
 * For blocking events, if any extension returns blocked=true, the action is prevented.
 */
export async function runExtensions(
  extensions: RegisteredExtension[],
  context: ExtensionContext
): Promise<ExtensionResult> {
  const isBlockingEvent = BLOCKING_EVENTS.includes(context.eventType);
  const applicableExtensions = extensions.filter(
    (ext) => ext.enabled && ext.events.includes(context.eventType)
  );

  const allLogs: string[] = [];
  let blocked = false;
  let blockReason: string | undefined;
  let currentData = { ...context.data };

  for (const ext of applicableExtensions) {
    try {
      const result = await executeExtensionCode(ext.code, {
        ...context,
        data: currentData,
      });

      allLogs.push(...(result.logs ?? []));

      if (result.modifiedData) {
        currentData = { ...currentData, ...result.modifiedData };
      }

      if (isBlockingEvent && result.blocked) {
        blocked = true;
        blockReason = result.blockReason ?? `Blocked by extension: ${ext.name}`;
        break;
      }
    } catch (error) {
      allLogs.push(`[${ext.name}] Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    blocked,
    blockReason,
    modifiedData: currentData,
    logs: allLogs,
  };
}

/**
 * Executes extension code in a sandboxed context.
 * The code receives `context` with eventType, data, and sessionState.
 * It should return { blocked?, blockReason?, modifiedData?, logs? }.
 */
async function executeExtensionCode(
  code: string,
  context: ExtensionContext
): Promise<Partial<ExtensionResult>> {
  try {
    const wrappedCode = `
      "use strict";
      const logs = [];
      const log = (msg) => logs.push(String(msg));
      const context = ${JSON.stringify(context)};
      let blocked = false;
      let blockReason = undefined;
      let modifiedData = undefined;

      try {
        ${code}
      } catch (e) {
        logs.push("Extension error: " + e.message);
      }

      return { blocked, blockReason, modifiedData, logs };
    `;

    const fn = new Function(wrappedCode);
    const result = fn();

    return {
      blocked: result?.blocked ?? false,
      blockReason: result?.blockReason,
      modifiedData: result?.modifiedData,
      logs: result?.logs ?? [],
    };
  } catch {
    return { blocked: false, logs: ["Failed to execute extension code"] };
  }
}

/** Pre-built extension templates */
export const EXTENSION_TEMPLATES: Record<string, { name: string; description: string; events: ExtensionEventType[]; code: string }> = {
  damageControl: {
    name: "Damage Control",
    description: "Block dangerous shell commands (rm -rf, drop table, etc.)",
    events: ["tool_call_blocked"],
    code: `
      const dangerousPatterns = [
        /rm\\s+-rf/i,
        /drop\\s+table/i,
        /drop\\s+database/i,
        /format\\s+c:/i,
        /del\\s+\\/s\\s+\\/q/i,
        /shutdown/i,
      ];
      if (context.eventType === "tool_call_blocked" && context.data.toolName === "bash") {
        const cmd = String(context.data.args?.command ?? "");
        for (const pattern of dangerousPatterns) {
          if (pattern.test(cmd)) {
            blocked = true;
            blockReason = "Blocked dangerous command: " + cmd;
            log("Blocked: " + cmd);
            break;
          }
        }
      }
    `,
  },
  costGuard: {
    name: "Cost Guard",
    description: "Block execution when session cost exceeds a threshold",
    events: ["cost_limit_warning"],
    code: `
      const maxCost = 5.0; // $5 per session
      const currentCost = context.data.totalCost ?? 0;
      if (currentCost > maxCost) {
        blocked = true;
        blockReason = "Session cost limit exceeded: $" + currentCost.toFixed(2) + " > $" + maxCost;
        log("Cost guard triggered at $" + currentCost.toFixed(2));
      }
    `,
  },
  toolLogger: {
    name: "Tool Logger",
    description: "Log all tool calls for debugging",
    events: ["tool_call_start", "tool_call_end", "tool_call_error"],
    code: `
      const tool = context.data.toolName ?? "unknown";
      const type = context.eventType;
      if (type === "tool_call_start") {
        log("[TOOL] Starting: " + tool);
      } else if (type === "tool_call_end") {
        log("[TOOL] Completed: " + tool);
      } else if (type === "tool_call_error") {
        log("[TOOL] Error in: " + tool + " - " + (context.data.error ?? ""));
      }
    `,
  },
};
