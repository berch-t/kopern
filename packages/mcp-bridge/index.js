#!/usr/bin/env node
/**
 * @kopern/mcp-bridge — stdio ↔ HTTP bridge for Claude Code
 *
 * Receives JSON-RPC messages on stdin (from Claude Code),
 * forwards them to a Kopern MCP endpoint over HTTP,
 * and returns responses on stdout.
 *
 * Environment variables:
 *   KOPERN_API_KEY  — your Kopern MCP API key (kpn_...)
 *   KOPERN_URL      — MCP endpoint URL (default: https://kopern.vercel.app/api/mcp)
 *
 * Claude Code config (~/.claude/settings.json):
 *   {
 *     "mcpServers": {
 *       "kopern": {
 *         "command": "npx",
 *         "args": ["@kopern/mcp-bridge"],
 *         "env": {
 *           "KOPERN_API_KEY": "kpn_your_key_here",
 *           "KOPERN_URL": "https://kopern.vercel.app/api/mcp"
 *         }
 *       }
 *     }
 *   }
 */

const API_KEY = process.env.KOPERN_API_KEY;
const BASE_URL = process.env.KOPERN_URL || "https://kopern.vercel.app/api/mcp";

if (!API_KEY) {
  process.stderr.write("Error: KOPERN_API_KEY environment variable is required\n");
  process.exit(1);
}

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;

  // JSON-RPC messages are newline-delimited
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) continue;
    handleMessage(line.trim());
  }
});

process.stdin.on("end", () => {
  if (buffer.trim()) handleMessage(buffer.trim());
});

async function handleMessage(raw) {
  let request;
  try {
    request = JSON.parse(raw);
  } catch {
    sendError(null, -32700, "Parse error");
    return;
  }

  const id = request.id;
  const method = request.method;

  // Handle MCP protocol methods locally
  if (method === "initialize") {
    // Forward to Kopern to get agent metadata
    try {
      const result = await forwardToKopern({ jsonrpc: "2.0", id, method: "initialize" });
      sendResult(id, result);
    } catch (err) {
      sendError(id, -32603, err.message);
    }
    return;
  }

  if (method === "tools/list") {
    // Return tool definitions the agent supports
    sendResult(id, {
      tools: [
        {
          name: "kopern_chat",
          description: "Send a message to your Kopern agent and get a response. The agent has access to its configured tools, skills, and connected GitHub repos.",
          inputSchema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Your message to the agent" },
            },
            required: ["message"],
          },
        },
        {
          name: "kopern_list_bugs",
          description: "List bugs tracked by the Kopern Bug Fixer agent.",
          inputSchema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["new", "analyzing", "fixing", "awaiting_review", "fixed", "closed"],
                description: "Filter by bug status (optional)",
              },
            },
          },
        },
      ],
    });
    return;
  }

  if (method === "tools/call") {
    const toolName = request.params?.name;
    const args = request.params?.arguments || {};

    if (toolName === "kopern_chat") {
      try {
        const result = await forwardToKopern({
          jsonrpc: "2.0",
          id,
          method: "completion/create",
          params: { message: args.message },
        });
        sendResult(id, { content: [{ type: "text", text: result.content || JSON.stringify(result) }] });
      } catch (err) {
        sendError(id, -32603, err.message);
      }
      return;
    }

    if (toolName === "kopern_list_bugs") {
      try {
        const result = await forwardToKopern({
          jsonrpc: "2.0",
          id,
          method: "bugs/list",
          params: { status: args.status },
        });
        sendResult(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      } catch (err) {
        sendError(id, -32603, err.message);
      }
      return;
    }

    sendError(id, -32601, `Unknown tool: ${toolName}`);
    return;
  }

  // Forward any other method to Kopern
  try {
    const result = await forwardToKopern(request);
    sendResult(id, result);
  } catch (err) {
    sendError(id, -32603, err.message);
  }
}

async function forwardToKopern(payload) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kopern API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result || data;
}

function sendResult(id, result) {
  const response = JSON.stringify({ jsonrpc: "2.0", id, result });
  process.stdout.write(response + "\n");
}

function sendError(id, code, message) {
  const response = JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
  process.stdout.write(response + "\n");
}
