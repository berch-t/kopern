#!/usr/bin/env node
/**
 * @kopern/mcp-server — stdio ↔ Streamable HTTP bridge
 *
 * Proxies JSON-RPC messages between any MCP client (Claude Code, Cursor, Windsurf)
 * and the Kopern Streamable HTTP endpoint. The Kopern server handles initialize,
 * tools/list (32 tools), and tools/call — this bridge just forwards everything.
 *
 * Environment variables:
 *   KOPERN_API_KEY  — your Kopern API key (kpn_...)
 *   KOPERN_URL      — endpoint (default: https://kopern.ai/api/mcp/server)
 *
 * Usage:
 *   npx @kopern/mcp-server
 *
 * Claude Code config (.mcp.json):
 *   {
 *     "mcpServers": {
 *       "kopern": {
 *         "command": "npx",
 *         "args": ["-y", "@kopern/mcp-server"],
 *         "env": { "KOPERN_API_KEY": "kpn_your_key_here" }
 *       }
 *     }
 *   }
 */

const { readFileSync } = require("fs");
const { join } = require("path");

const API_KEY = process.env.KOPERN_API_KEY;
const BASE_URL = process.env.KOPERN_URL || "https://kopern.ai/api/mcp/server";

// Static tool definitions for registry crawlers (Glama, Smithery, etc.)
// Runtime tools/list is still served by the remote endpoint.
const TOOLS = JSON.parse(readFileSync(join(__dirname, "tools.json"), "utf8"));

if (!API_KEY) {
  process.stderr.write(
    "[kopern-mcp] Error: KOPERN_API_KEY is required.\n" +
    "  Get your key at https://kopern.ai → Settings → API Keys\n"
  );
  process.exit(1);
}

process.stderr.write(`[kopern-mcp] Kopern MCP Server v2.0.5 — 32 tools\n`);
process.stderr.write(`[kopern-mcp] Endpoint: ${BASE_URL}\n`);

// ---------- stdio JSON-RPC transport ----------

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
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

// ---------- message handler ----------

async function handleMessage(raw) {
  let request;
  try {
    request = JSON.parse(raw);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }

  const { id, method } = request;

  // Notifications (no id) — just forward silently
  if (id === undefined && method === "notifications/initialized") {
    // Client tells us it received initialize — no response needed
    return;
  }

  // ping — respond locally for speed
  if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} });
    return;
  }

  // Everything else: forward to Kopern Streamable HTTP endpoint
  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(300_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      send({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: `Kopern HTTP ${res.status}: ${text.slice(0, 300)}` },
      });
      return;
    }

    const data = await res.json();

    // The Kopern endpoint returns a full JSON-RPC response — pass it through
    if (data.jsonrpc) {
      send(data);
    } else if (data.result !== undefined) {
      send({ jsonrpc: "2.0", id, result: data.result });
    } else {
      send({ jsonrpc: "2.0", id, result: data });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[kopern-mcp] Error: ${message}\n`);
    send({
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: `Bridge error: ${message}` },
    });
  }
}

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}
