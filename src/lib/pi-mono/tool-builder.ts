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
  { id: "datagouv", name: "data.gouv.fr", description: "Search, explore, and query 50,000+ French open datasets (DVF, LEGI, cadastre, DGFiP, etc.)" },
  { id: "piste", name: "Légifrance (PISTE)", description: "Search and read French legal texts — codes, laws, decrees, and collective agreements via the official Légifrance API" },
  { id: "memory", name: "Agent Memory", description: "Remember facts across conversations, recall context, and search past sessions" },
  { id: "service_email", name: "Email (Gmail/Outlook)", description: "Read, send, and reply to emails via connected Google or Microsoft account" },
  { id: "service_calendar", name: "Calendar (Google/Outlook)", description: "List events, check availability, create/update/cancel calendar events" },
  { id: "web_fetch", name: "Web Fetch", description: "Fetch any URL and extract text content — web pages, APIs, RSS feeds, robots.txt, sitemaps" },
  { id: "code_interpreter", name: "Code Interpreter", description: "Execute Python, Node.js, or Bash code in a secure cloud sandbox — data analysis, charts, scraping, file processing" },
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
