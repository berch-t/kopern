// Tool Builder — transforms DB tool documents into executable tool definitions

import { type ToolDoc } from "@/lib/firebase/firestore";

export interface BuiltTool {
  name: string;
  label: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export const BUILTIN_TOOLS = [
  { id: "github_write", name: "GitHub Write", description: "Create branches, commit files, and open PRs on connected repos" },
  { id: "bug_management", name: "Bug Management", description: "Track, update, and respond to bug reports (admin)", adminOnly: true },
  { id: "slack_read", name: "Slack Read", description: "Read messages and list channels from connected Slack workspace" },
] as const;

export function buildCustomTool(toolDoc: ToolDoc): BuiltTool {
  let schema: Record<string, unknown> = {};
  try {
    schema = JSON.parse(toolDoc.parametersSchema);
  } catch {
    schema = { type: "object", properties: {} };
  }

  return {
    name: toolDoc.name,
    label: toolDoc.label,
    description: toolDoc.description,
    parametersSchema: schema,
    execute: async (args: Record<string, unknown>) => {
      // Custom tool execution happens in sandbox — see sandbox/executor.ts
      const { executeSandboxed } = await import("@/lib/sandbox/executor");
      return executeSandboxed(toolDoc.executeCode, args);
    },
  };
}

export function buildCustomTools(tools: ToolDoc[]): BuiltTool[] {
  return tools.map(buildCustomTool);
}
