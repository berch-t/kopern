// Built-in tools available to agents in the playground
// These are real, executable tools that the LLM can call

import { adminDb } from "@/lib/firebase/admin";
import { type ToolDefinition, type ToolCallResult } from "@/lib/llm/client";

// --- Helpers ---

/** Encode each path segment for GitHub API URLs (handles [locale], (public), etc.) */
function encodeGitHubPath(path: string): string {
  return path.split("/").map((seg) => encodeURIComponent(seg)).join("/");
}

// --- Slack Tool Definitions ---

export function getSlackTools(): ToolDefinition[] {
  return [
    {
      name: "slack_read_messages",
      description: `Read messages from a Slack channel for a specific date. Returns the message text, author, and timestamp. Use channel IDs (e.g. C0AN6D3L8KT) or channel names as provided by the user. If no date is given, reads recent messages.`,
      input_schema: {
        type: "object",
        properties: {
          channel: { type: "string", description: "Slack channel ID (e.g. C0AN6D3L8KT) or channel name reference" },
          date: { type: "string", description: "Date in YYYY-MM-DD format (optional — defaults to today)" },
          limit: { type: "number", description: "Maximum number of messages to return (default 100, max 200)" },
        },
        required: ["channel"],
      },
    },
    {
      name: "slack_list_channels",
      description: `List Slack channels the bot has access to. Returns channel names and IDs. Useful to discover available channels before reading messages.`,
      input_schema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Maximum number of channels (default 100)" },
        },
      },
    },
  ];
}

// --- Tool Definitions (sent to LLM) ---

export function getGithubTools(connectedRepos: string[], includeWrite = false): ToolDefinition[] {
  if (connectedRepos.length === 0) return [];

  const repoList = connectedRepos.join(", ");

  const readTools: ToolDefinition[] = [
    {
      name: "read_file",
      description: `Read the content of a specific file from a connected GitHub repository. Available repos: ${repoList}. Use the file tree provided in context to find valid file paths.`,
      input_schema: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Repository in owner/name format" },
          path: { type: "string", description: "File path relative to repo root (e.g. src/index.ts)" },
          branch: { type: "string", description: "Branch name (defaults to main/master)" },
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
          repo: { type: "string", description: "Repository in owner/name format" },
          pattern: { type: "string", description: "Search pattern (substring match on file paths, case-insensitive)" },
        },
        required: ["repo", "pattern"],
      },
    },
  ];

  if (!includeWrite) return readTools;

  const writeTools: ToolDefinition[] = [
    {
      name: "create_branch",
      description: `Create a new branch from the default branch (main/master) in a connected repo. Available repos: ${repoList}. NEVER create branches on main directly.`,
      input_schema: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Repository in owner/name format" },
          branch: { type: "string", description: "New branch name (e.g. fix/bug-123-login-crash)" },
          from: { type: "string", description: "Source branch (defaults to main)" },
        },
        required: ["repo", "branch"],
      },
    },
    {
      name: "commit_files",
      description: `Commit one or more file changes to an existing branch. Uses the Git Data API (create blobs → create tree → create commit → update ref). NEVER commit directly to main.`,
      input_schema: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Repository in owner/name format" },
          branch: { type: "string", description: "Target branch (must NOT be main/master)" },
          message: { type: "string", description: "Commit message" },
          files: {
            type: "array",
            description: "Files to commit",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "File path relative to repo root" },
                content: { type: "string", description: "Full file content (UTF-8)" },
              },
              required: ["path", "content"],
            },
          },
        },
        required: ["repo", "branch", "message", "files"],
      },
    },
    {
      name: "create_pull_request",
      description: `Create a pull request from a feature branch to main. The PR will NOT be auto-merged — it requires human review. Available repos: ${repoList}.`,
      input_schema: {
        type: "object",
        properties: {
          repo: { type: "string", description: "Repository in owner/name format" },
          title: { type: "string", description: "PR title (short, descriptive)" },
          body: { type: "string", description: "PR description (markdown)" },
          head: { type: "string", description: "Source branch name" },
          base: { type: "string", description: "Target branch (defaults to main)" },
        },
        required: ["repo", "title", "body", "head"],
      },
    },
  ];

  return [...readTools, ...writeTools];
}

function sanitizeToolName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 64);
}

/**
 * Ensures a tool schema is valid for the Anthropic API:
 * - Top-level must be { type: "object", properties: { ... } }
 * - Handles flat schemas where properties are at the top level
 * - Sanitizes all property keys to match ^[a-zA-Z0-9_.-]{1,64}$
 * Used as the single source of truth for schema normalization across all code paths.
 */
export function ensureValidToolSchema(raw: Record<string, unknown>): Record<string, unknown> {
  let schema = { ...raw };
  // If type is not literally the string "object", the parsed object IS the properties
  if (schema.type !== "object") {
    schema = { type: "object", properties: schema };
  }
  if (!schema.properties) {
    schema.properties = {};
  }
  return sanitizeSchemaKeys(schema) as Record<string, unknown>;
}

/** Recursively sanitize all property keys in a JSON Schema to match Anthropic's pattern */
function sanitizeSchemaKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeSchemaKeys);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const safeKey = sanitizeKey(key);
    if (key === "properties" && value && typeof value === "object" && !Array.isArray(value)) {
      const sanitizedProps: Record<string, unknown> = {};
      for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
        sanitizedProps[sanitizeKey(propKey)] = sanitizeSchemaKeys(propValue);
      }
      result[safeKey] = sanitizedProps;
    } else if (key === "required" && Array.isArray(value)) {
      result[safeKey] = (value as string[]).map((k) => typeof k === "string" ? sanitizeKey(k) : k);
    } else {
      result[safeKey] = sanitizeSchemaKeys(value);
    }
  }
  return result;
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
    schema = ensureValidToolSchema(schema);
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
  slackBotToken?: string;
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
      case "create_branch":
        return await executeCreateBranch(toolCall.input, ctx);
      case "commit_files":
        return await executeCommitFiles(toolCall.input, ctx);
      case "create_pull_request":
        return await executeCreatePR(toolCall.input, ctx);
      case "slack_read_messages":
        return await executeSlackReadMessages(toolCall.input, ctx);
      case "slack_list_channels":
        return await executeSlackListChannels(toolCall.input, ctx);
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

  const githubToken = await getGitHubToken(ctx.userId);

  const fileRes = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeGitHubPath(path)}?ref=${branch}`,
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
  if (content.length > 100000) {
    content = content.slice(0, 100000) + "\n\n[... truncated at 100KB]";
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

  const githubToken = await getGitHubToken(ctx.userId);

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

// --- Helper: get GitHub token ---

async function getGitHubToken(userId: string): Promise<string> {
  const userSnap = await adminDb.doc(`users/${userId}`).get();
  const token = userSnap.data()?.githubAccessToken;
  if (!token) throw new Error("No GitHub token found. Please reconnect your GitHub account.");
  return token;
}

async function ghApi(token: string, url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

// --- Built-in: create_branch ---

async function executeCreateBranch(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<{ result: string; isError: boolean }> {
  const repo = args.repo as string;
  const branch = args.branch as string;
  const from = (args.from as string) || "main";

  if (!repo || !branch) return { result: "Missing required: repo, branch", isError: true };
  if (!ctx.connectedRepos.includes(repo)) return { result: `Repo ${repo} not connected.`, isError: true };
  if (["main", "master"].includes(branch)) return { result: "Cannot create a branch named main/master.", isError: true };

  const token = await getGitHubToken(ctx.userId);

  // Get the SHA of the source branch
  const refData = await ghApi(token, `https://api.github.com/repos/${repo}/git/ref/heads/${from}`);
  const sha = refData.object.sha;

  // Create the new branch
  await ghApi(token, `https://api.github.com/repos/${repo}/git/refs`, "POST", {
    ref: `refs/heads/${branch}`,
    sha,
  });

  return { result: `Branch "${branch}" created from "${from}" (${sha.slice(0, 7)})`, isError: false };
}

// --- Built-in: commit_files ---

async function executeCommitFiles(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<{ result: string; isError: boolean }> {
  const repo = args.repo as string;
  const branch = args.branch as string;
  const message = args.message as string;
  const files = args.files as { path: string; content: string }[];

  if (!repo || !branch || !message || !files?.length) {
    return { result: "Missing required: repo, branch, message, files", isError: true };
  }
  if (!ctx.connectedRepos.includes(repo)) return { result: `Repo ${repo} not connected.`, isError: true };
  if (["main", "master"].includes(branch)) return { result: "SAFETY: Cannot commit directly to main/master.", isError: true };

  const token = await getGitHubToken(ctx.userId);
  const base = `https://api.github.com/repos/${repo}`;

  // 1. Get current commit SHA from branch
  const refData = await ghApi(token, `${base}/git/ref/heads/${branch}`);
  const parentSha = refData.object.sha;

  // 2. Get the base tree
  const commitData = await ghApi(token, `${base}/git/commits/${parentSha}`);
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const blob = await ghApi(token, `${base}/git/blobs`, "POST", {
        content: file.content,
        encoding: "utf-8",
      });
      return { path: file.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
    })
  );

  // 4. Create tree
  const newTree = await ghApi(token, `${base}/git/trees`, "POST", {
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // 5. Create commit
  const newCommit = await ghApi(token, `${base}/git/commits`, "POST", {
    message,
    tree: newTree.sha,
    parents: [parentSha],
  });

  // 6. Update branch ref
  await ghApi(token, `${base}/git/refs/heads/${branch}`, "PATCH", {
    sha: newCommit.sha,
  });

  return {
    result: `Committed ${files.length} file(s) to ${branch}: ${newCommit.sha.slice(0, 7)} — ${message}`,
    isError: false,
  };
}

// --- Built-in: create_pull_request ---

async function executeCreatePR(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<{ result: string; isError: boolean }> {
  const repo = args.repo as string;
  const title = args.title as string;
  const body = args.body as string;
  const head = args.head as string;
  const base = (args.base as string) || "main";

  if (!repo || !title || !body || !head) {
    return { result: "Missing required: repo, title, body, head", isError: true };
  }
  if (!ctx.connectedRepos.includes(repo)) return { result: `Repo ${repo} not connected.`, isError: true };

  const token = await getGitHubToken(ctx.userId);

  const pr = await ghApi(token, `https://api.github.com/repos/${repo}/pulls`, "POST", {
    title,
    body: `${body}\n\n---\n*Automated fix by Kopern Bug Fixer Agent*`,
    head,
    base,
  });

  return {
    result: `Pull request created: ${pr.html_url}\nTitle: ${title}\nStatus: Open (awaiting human review)`,
    isError: false,
  };
}

// --- Built-in: slack_read_messages ---

async function executeSlackReadMessages(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<{ result: string; isError: boolean }> {
  if (!ctx.slackBotToken) {
    return { result: "No Slack connection configured for this agent. Connect Slack from the Connectors page in the Kopern dashboard.", isError: true };
  }

  const channel = args.channel as string;
  if (!channel) {
    return { result: "Missing required parameter: channel (channel ID like C0AN6D3L8KT)", isError: true };
  }

  const limit = Math.min(Number(args.limit) || 100, 200);

  // Build time range from date (if provided)
  const params = new URLSearchParams({
    channel,
    limit: String(limit),
    inclusive: "true",
  });

  const dateStr = args.date as string | undefined;
  if (dateStr) {
    // Parse YYYY-MM-DD to Unix timestamps (start and end of day UTC)
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return { result: `Invalid date format: "${dateStr}". Use YYYY-MM-DD (e.g. 2026-03-22).`, isError: true };
    }
    const dayStart = new Date(`${dateStr}T00:00:00Z`).getTime() / 1000;
    const dayEnd = new Date(`${dateStr}T23:59:59Z`).getTime() / 1000;
    params.set("oldest", String(dayStart));
    params.set("latest", String(dayEnd));
  }

  const res = await fetch(`https://slack.com/api/conversations.history?${params.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${ctx.slackBotToken}` },
  });

  const data = await res.json() as { ok: boolean; error?: string; messages?: { user?: string; bot_id?: string; text: string; ts: string }[] };

  if (!data.ok) {
    const errorMap: Record<string, string> = {
      channel_not_found: `Channel "${channel}" not found. Check the channel ID or make sure the bot is invited to the channel.`,
      not_in_channel: `The bot is not a member of channel "${channel}". Invite the bot with /invite @bot in that channel.`,
      missing_scope: "The bot lacks the 'channels:history' permission. Reinstall the Slack app with the correct scopes.",
      invalid_auth: "The bot token is invalid. Reconnect Slack from the Kopern dashboard.",
    };
    return { result: errorMap[data.error || ""] || `Slack API error: ${data.error}`, isError: true };
  }

  const messages = data.messages || [];
  if (messages.length === 0) {
    return {
      result: dateStr
        ? `No messages found in channel ${channel} for date ${dateStr}.`
        : `No messages found in channel ${channel}.`,
      isError: false,
    };
  }

  // Format messages (reverse to chronological order)
  const formatted = messages
    .reverse()
    .map((msg) => {
      const time = new Date(parseFloat(msg.ts) * 1000).toISOString().slice(0, 19).replace("T", " ");
      const author = msg.bot_id ? "[bot]" : (msg.user || "unknown");
      return `[${time}] <@${author}> ${msg.text}`;
    })
    .join("\n");

  return {
    result: `Found ${messages.length} message(s)${dateStr ? ` for ${dateStr}` : ""}:\n\n${formatted}`,
    isError: false,
  };
}

// --- Built-in: slack_list_channels ---

async function executeSlackListChannels(
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<{ result: string; isError: boolean }> {
  if (!ctx.slackBotToken) {
    return { result: "No Slack connection configured for this agent.", isError: true };
  }

  const limit = Math.min(Number(args.limit) || 100, 200);

  const res = await fetch(
    `https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=${limit}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${ctx.slackBotToken}` },
    }
  );

  const data = await res.json() as { ok: boolean; error?: string; channels?: { id: string; name: string; is_member: boolean; num_members: number; purpose?: { value: string } }[] };

  if (!data.ok) {
    return { result: `Slack API error: ${data.error}`, isError: true };
  }

  const channels = data.channels || [];
  if (channels.length === 0) {
    return { result: "No channels found. The bot may not have access to any channels.", isError: false };
  }

  const formatted = channels
    .map((ch) => {
      const member = ch.is_member ? "✓ member" : "✗ not joined";
      const purpose = ch.purpose?.value ? ` — ${ch.purpose.value.slice(0, 80)}` : "";
      return `#${ch.name} (${ch.id}) [${member}, ${ch.num_members} members]${purpose}`;
    })
    .join("\n");

  return {
    result: `Found ${channels.length} channel(s):\n\n${formatted}`,
    isError: false,
  };
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
