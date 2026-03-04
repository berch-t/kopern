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
  { id: "read", name: "Read File", description: "Read file contents" },
  { id: "write", name: "Write File", description: "Write content to a file" },
  { id: "edit", name: "Edit File", description: "Edit file with find/replace" },
  { id: "bash", name: "Bash", description: "Execute shell commands" },
  { id: "grep", name: "Grep", description: "Search file contents" },
  { id: "find", name: "Find", description: "Find files by pattern" },
  { id: "ls", name: "List", description: "List directory contents" },
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
