// Built-in tools available to agents in the playground
// These are real, executable tools that the LLM can call

import { adminDb } from "@/lib/firebase/admin";
import { type ToolDefinition, type ToolCallResult } from "@/lib/llm/client";

// --- Tool Definitions (sent to LLM) ---

export function getGithubTools(connectedRepos: string[]): ToolDefinition[] {
  if (connectedRepos.length === 0) return [];

  const repoList = connectedRepos.join(", ");

  return [
    {
      name: "read_file",
      description: `Read the content of a specific file from a connected GitHub repository. Available repos: ${repoList}. Use the file tree provided in context to find valid file paths.`,
      input_schema: {
        type: "object",
        properties: {
          repo: {
            type: "string",
            description: "Repository in owner/name format",
          },
          path: {
            type: "string",
            description: "File path relative to repo root (e.g. src/index.ts)",
          },
          branch: {
            type: "string",
            description: "Branch name (defaults to main/master)",
          },
        },
        required: ["repo", "path"],
      },
    },
    {
      name: "search_files",
      description: `Search for files matching a pattern in a connected GitHub repository. Available repos: ${repoList}. Returns matching file paths from the repo tree.`,
      input_schema: {
        type: "object",
        properties: {
          repo: {
            type: "string",
            description: "Repository in owner/name format",
          },
          pattern: {
            type: "string",
            description: "Search pattern (substring match on file paths, case-insensitive)",
          },
        },
        required: ["repo", "pattern"],
      },
    },
  ];
}

function sanitizeToolName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

export function getCustomToolDefinitions(
  tools: { name: string; description: string; parametersSchema: string }[]
): ToolDefinition[] {
  return tools.filter((t) => t.name).map((t) => {
    let schema: Record<string, unknown>;
    try {
      schema = JSON.parse(t.parametersSchema);
    } catch {
      schema = { type: "object", properties: {} };
    }
    // Ensure type: "object" is always present — Anthropic requires it
    if (!schema.type) {
      schema.type = "object";
    }
    if (!schema.properties) {
      schema.properties = {};
    }
    return {
      name: sanitizeToolName(t.name),
      description: t.description || "Custom tool",
      input_schema: schema,
    };
  });
}

// --- Tool Execution ---

export interface ToolExecutionContext {
  userId: string;
  connectedRepos: string[];
  customTools: { name: string; description: string; parametersSchema: string; executeCode: string }[];
}

export async function executeTool(
  toolCall: ToolCallResult,
  ctx: ToolExecutionContext
): Promise<{ result: string; isError: boolean }> {
  try {
    switch (toolCall.name) {
      case "read_file":
        return await executeReadFile(toolCall.input, ctx);
      case "search_files":
        return await executeSearchFiles(toolCall.input, ctx);
      default:
        return await executeCustomTool(toolCall, ctx);
    }
  } catch (err) {
    return { result: `Tool execution error: ${(err as Error).message}`, isError: true };
  }
}

// --- Built-in: read_file ---

async function executeReadFile(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<{ result: string; isError: boolean }> {
  const repo = args.repo as string;
  const path = args.path as string;
  const branch = (args.branch as string) || "main";

  if (!repo || !path) {
    return { result: "Missing required parameters: repo and path", isError: true };
  }

  if (!ctx.connectedRepos.includes(repo)) {
    return { result: `Repository ${repo} is not connected to this agent. Connected repos: ${ctx.connectedRepos.join(", ")}`, isError: true };
  }

  // Get user's GitHub token
  const userSnap = await adminDb.doc(`users/${ctx.userId}`).get();
  const githubToken = userSnap.data()?.githubAccessToken;
  if (!githubToken) {
    return { result: "No GitHub token found. Please reconnect your GitHub account.", isError: true };
  }

  const fileRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.raw+json",
      },
    }
  );

  if (!fileRes.ok) {
    return { result: `File not found: ${repo}/${path} (${fileRes.status})`, isError: true };
  }

  let content = await fileRes.text();
  if (content.length > 50000) {
    content = content.slice(0, 50000) + "\n\n[... truncated at 50KB]";
  }

  return { result: content, isError: false };
}

// --- Built-in: search_files ---

async function executeSearchFiles(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<{ result: string; isError: boolean }> {
  const repo = args.repo as string;
  const pattern = args.pattern as string;

  if (!repo || !pattern) {
    return { result: "Missing required parameters: repo and pattern", isError: true };
  }

  if (!ctx.connectedRepos.includes(repo)) {
    return { result: `Repository ${repo} is not connected.`, isError: true };
  }

  const userSnap = await adminDb.doc(`users/${ctx.userId}`).get();
  const githubToken = userSnap.data()?.githubAccessToken;
  if (!githubToken) {
    return { result: "No GitHub token found.", isError: true };
  }

  const IGNORE_PATTERNS = [
    /^node_modules\//,
    /^\.git\//,
    /^dist\//,
    /^build\//,
    /^\.next\//,
    /^coverage\//,
    /^__pycache__\//,
    /\.lock$/,
    /\.map$/,
  ];

  const treeRes = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!treeRes.ok) {
    return { result: `Failed to fetch repo tree: ${treeRes.status}`, isError: true };
  }

  const treeData = await treeRes.json();
  const lowerPattern = pattern.toLowerCase();

  const matches = (treeData.tree || [])
    .filter((item: { path: string; type: string }) => {
      if (item.type !== "blob") return false;
      if (IGNORE_PATTERNS.some((p) => p.test(item.path))) return false;
      return item.path.toLowerCase().includes(lowerPattern);
    })
    .map((item: { path: string }) => item.path)
    .slice(0, 50);

  if (matches.length === 0) {
    return { result: `No files matching "${pattern}" found in ${repo}`, isError: false };
  }

  return { result: matches.join("\n"), isError: false };
}

// --- Custom tools (sandbox execution) ---

async function executeCustomTool(
  toolCall: ToolCallResult,
  ctx: ToolExecutionContext
): Promise<{ result: string; isError: boolean }> {
  const tool = ctx.customTools.find((t) => t.name === toolCall.name);
  if (!tool) {
    return { result: `Unknown tool: ${toolCall.name}`, isError: true };
  }

  try {
    const { executeSandboxed } = await import("@/lib/sandbox/executor");
    const result = await executeSandboxed(tool.executeCode, toolCall.input);
    return { result, isError: false };
  } catch (err) {
    return { result: `Tool error: ${(err as Error).message}`, isError: true };
  }
}
