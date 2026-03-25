export const apiReferenceMarkdown = `
## Introduction

The Kopern API lets you interact with your AI agents programmatically. Send messages, receive streaming responses, trigger webhooks, and manage API keys — all through a RESTful HTTP interface.

### Base URL

\`\`\`
https://kopern.ai
\`\`\`

All API endpoints are relative to this base URL. For self-hosted deployments, replace with your own domain.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Agent** | An AI agent you've built on Kopern (system prompt, skills, tools, model) |
| **API Key** | A \`kpn_\` prefixed key that authenticates requests and binds to a specific agent |
| **MCP Server** | A connector that exposes your agent as a tool server (MCP protocol) |
| **Session** | A tracked conversation — each API call creates a session for billing and observability |
| **Tool Calling** | Agents can execute custom tools (sandboxed JS) and built-in tools (GitHub, etc.) during a conversation |

---

## Authentication

All API endpoints require authentication via API keys. Keys are created in the Kopern dashboard under **Agent > MCP Servers** or **Agent > Connectors**.

### API Key Format

API keys use the \`kpn_\` prefix followed by a random string:

\`\`\`
kpn_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
\`\`\`

### Passing Your API Key

You can authenticate in two ways:

**Bearer Token (recommended)**

\`\`\`bash
curl https://kopern.ai/api/webhook/AGENT_ID \\
  -H "Authorization: Bearer kpn_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello"}'
\`\`\`

**Query Parameter**

\`\`\`bash
curl "https://kopern.ai/api/webhook/AGENT_ID?key=kpn_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello"}'
\`\`\`

### Key Binding

Each API key is bound to a specific agent. Attempting to use a key with a different agent returns **403 Forbidden**.

### Key Management

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create key | \`POST\` | \`/api/mcp/keys\` |
| Rotate key | \`PUT\` | \`/api/mcp/keys\` |
| Delete key | \`DELETE\` | \`/api/mcp/keys\` |

Keys are hashed with SHA-256 before storage. The plain key is returned **once** on creation or rotation — store it securely.

---

## Errors

All endpoints return errors in a consistent JSON format. The OpenAI-Compatible endpoint uses OpenAI's error format; all other endpoints use Kopern's format.

### Kopern Error Format

\`\`\`json
{
  "error": "Human-readable error message"
}
\`\`\`

### OpenAI-Compatible Error Format

\`\`\`json
{
  "error": {
    "message": "Human-readable error message",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
\`\`\`

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| **200** | Success |
| **204** | Success (no content — CORS preflight) |
| **400** | Bad Request — invalid JSON or missing required fields |
| **401** | Unauthorized — missing, invalid, or expired API key |
| **403** | Forbidden — key/agent mismatch, plan limit exceeded, or feature disabled |
| **404** | Not Found — agent, webhook, or server does not exist |
| **429** | Too Many Requests — rate limit exceeded (check \`Retry-After\` header) |
| **500** | Server Error — internal failure during agent execution |

### Validation Errors

When request body validation fails, the response includes field-level details:

\`\`\`json
{
  "error": "Invalid request body",
  "details": [
    "message: String must contain at least 1 character(s)",
    "history.0.role: Invalid enum value"
  ]
}
\`\`\`

---

## Rate Limits

All endpoints are rate-limited using sliding window counters. Limits are per-identifier (API key, agent ID, or user ID depending on the endpoint).

### Limits by Endpoint

| Endpoint | Limit | Window | Identifier |
|----------|-------|--------|------------|
| Chat (dashboard) | 30 req | 1 min | userId |
| Widget chat | 20 req | 1 min | API key |
| Webhook inbound | 60 req | 1 min | agentId |
| MCP Server | 30 req | 1 min | agentId |
| OpenAI-Compatible | 30 req | 1 min | agentId |
| Slack / Telegram / WhatsApp | 15 req | 1 min | team/bot/phone |
| API key management | 60 req | 1 min | default |

### Rate Limit Headers

When rate-limited, responses include:

\`\`\`
HTTP/1.1 429 Too Many Requests
Retry-After: 23
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711382400000
\`\`\`

| Header | Description |
|--------|-------------|
| \`Retry-After\` | Seconds until the next request is allowed |
| \`X-RateLimit-Limit\` | Maximum requests per window |
| \`X-RateLimit-Remaining\` | Remaining requests in the current window |
| \`X-RateLimit-Reset\` | Unix timestamp (ms) when the window resets |

---

## Plan Limits

API access is gated by your Kopern subscription plan. Every request checks:

1. **Token budget** — monthly token usage limit
2. **Connector limit** — number of active connectors (API keys)

When a limit is exceeded, the API returns **403** with the specific reason. Upgrade your plan in the dashboard to increase limits.

---

## OpenAI-Compatible Endpoint

Drop-in replacement for OpenAI's \`/v1/chat/completions\` API. Use any OpenAI SDK or tool (Cursor, Continue, LiteLLM, etc.) pointed at your Kopern agent.

### Create Chat Completion

\`\`\`
POST /api/agents/{agent_id}/v1/chat/completions
\`\`\`

**Authentication:** Bearer token or \`?key=\` query parameter.

### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`messages\` | array | Yes | Array of message objects with \`role\` and \`content\` |
| \`stream\` | boolean | No | If \`true\`, stream responses as SSE (default: \`false\`) |
| \`model\` | string | No | Ignored — the agent's configured model is always used |
| \`temperature\` | number | No | Ignored — use the agent's configuration |

### Message Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`role\` | string | Yes | \`"user"\`, \`"assistant"\`, or \`"system"\` (system messages are ignored — the agent's system prompt is used) |
| \`content\` | string | Yes | The message content |

### Non-Streaming Response

\`\`\`json
{
  "id": "chatcmpl-m1a2b3c4d5",
  "object": "chat.completion",
  "created": 1711382400,
  "model": "claude-sonnet-4-20250514",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 12,
    "total_tokens": 54
  }
}
\`\`\`

### Streaming Response

When \`stream: true\`, the response is a Server-Sent Events stream:

\`\`\`
data: {"id":"chatcmpl-m1a2b3","object":"chat.completion.chunk","created":1711382400,"model":"claude-sonnet-4-20250514","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-m1a2b3","object":"chat.completion.chunk","created":1711382400,"model":"claude-sonnet-4-20250514","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-m1a2b3","object":"chat.completion.chunk","created":1711382400,"model":"claude-sonnet-4-20250514","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chatcmpl-m1a2b3","object":"chat.completion.chunk","created":1711382400,"model":"claude-sonnet-4-20250514","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
\`\`\`

### Example: cURL (Non-Streaming)

\`\`\`bash
curl https://kopern.ai/api/agents/YOUR_AGENT_ID/v1/chat/completions \\
  -H "Authorization: Bearer kpn_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "user", "content": "What is Kopern?"}
    ]
  }'
\`\`\`

### Example: cURL (Streaming)

\`\`\`bash
curl https://kopern.ai/api/agents/YOUR_AGENT_ID/v1/chat/completions \\
  -H "Authorization: Bearer kpn_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "user", "content": "Explain quantum computing"}
    ],
    "stream": true
  }'
\`\`\`

### Example: Python (OpenAI SDK)

\`\`\`python
from openai import OpenAI

client = OpenAI(
    api_key="kpn_your_key",
    base_url="https://kopern.ai/api/agents/YOUR_AGENT_ID/v1"
)

response = client.chat.completions.create(
    model="kopern",  # ignored — agent's model is used
    messages=[
        {"role": "user", "content": "Analyze this data..."}
    ]
)

print(response.choices[0].message.content)
\`\`\`

### Example: Python (Streaming)

\`\`\`python
from openai import OpenAI

client = OpenAI(
    api_key="kpn_your_key",
    base_url="https://kopern.ai/api/agents/YOUR_AGENT_ID/v1"
)

stream = client.chat.completions.create(
    model="kopern",
    messages=[{"role": "user", "content": "Write a poem"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
\`\`\`

### Example: Cursor / Continue IDE

Add this to your IDE configuration:

\`\`\`json
{
  "models": [
    {
      "title": "My Kopern Agent",
      "provider": "openai",
      "model": "kopern",
      "apiBase": "https://kopern.ai/api/agents/YOUR_AGENT_ID/v1",
      "apiKey": "kpn_your_key"
    }
  ]
}
\`\`\`

### Example: Node.js

\`\`\`javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "kpn_your_key",
  baseURL: "https://kopern.ai/api/agents/YOUR_AGENT_ID/v1",
});

const completion = await client.chat.completions.create({
  model: "kopern",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(completion.choices[0].message.content);
\`\`\`

---

## Webhook Inbound

Send a message to your agent and receive a synchronous JSON response. Ideal for integrations with n8n, Zapier, Make, or any HTTP client.

### Send Message

\`\`\`
POST /api/webhook/{agent_id}
\`\`\`

**Authentication:** Bearer token or \`?key=\` query parameter.

### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`message\` | string | Yes | The message to send (1–10,000 chars) |
| \`metadata\` | object | No | Arbitrary key-value metadata injected into the agent's context |
| \`sessionId\` | string | No | Reuse an existing session for multi-turn conversations |
| \`webhookId\` | string | No | If provided, HMAC signature is verified against this webhook's secret |

### HMAC Signature Verification

For webhooks configured with a secret, include the signature in the \`X-Webhook-Signature\` header:

\`\`\`bash
SIGNATURE=$(echo -n '{"message":"Hello"}' | openssl dgst -sha256 -hmac "your_webhook_secret" | cut -d' ' -f2)

curl https://kopern.ai/api/webhook/AGENT_ID?key=kpn_your_key \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Signature: $SIGNATURE" \\
  -d '{"message": "Hello", "webhookId": "your_webhook_id"}'
\`\`\`

### Response

\`\`\`json
{
  "response": "The agent's complete text response",
  "ai_generated": true,
  "metrics": {
    "inputTokens": 156,
    "outputTokens": 423,
    "toolCallCount": 2
  }
}
\`\`\`

### Error Response

\`\`\`json
{
  "error": "Agent execution failed"
}
\`\`\`

### Example: cURL

\`\`\`bash
curl -X POST https://kopern.ai/api/webhook/YOUR_AGENT_ID \\
  -H "Authorization: Bearer kpn_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Summarize the latest sales report",
    "metadata": {
      "source": "crm",
      "priority": "high"
    }
  }'
\`\`\`

### Example: Python

\`\`\`python
import requests

response = requests.post(
    "https://kopern.ai/api/webhook/YOUR_AGENT_ID",
    headers={
        "Authorization": "Bearer kpn_your_key",
        "Content-Type": "application/json",
    },
    json={
        "message": "What's the status of order #12345?",
        "metadata": {"orderId": "12345"},
    },
)

data = response.json()
print(data["response"])
print(f"Tokens used: {data['metrics']['inputTokens'] + data['metrics']['outputTokens']}")
\`\`\`

### Example: n8n (HTTP Request Node)

1. Add an **HTTP Request** node
2. Set **Method** to \`POST\`
3. Set **URL** to \`https://kopern.ai/api/webhook/YOUR_AGENT_ID?key=kpn_your_key\`
4. Set **Body Content Type** to \`JSON\`
5. Set **Body** to:
\`\`\`json
{
  "message": "{{ $json.input_text }}"
}
\`\`\`
6. The response is available at \`{{ $json.response }}\`

### Example: Zapier (Custom Request)

1. Add a **Webhooks by Zapier** action → **Custom Request**
2. Set **Method** to \`POST\`
3. Set **URL** to \`https://kopern.ai/api/webhook/YOUR_AGENT_ID\`
4. Set **Headers**: \`Authorization: Bearer kpn_your_key\` and \`Content-Type: application/json\`
5. Set **Data** to: \`{"message": "Your dynamic content here"}\`

### Example: Make (HTTP Module)

1. Add an **HTTP > Make a request** module
2. Set **URL** to \`https://kopern.ai/api/webhook/YOUR_AGENT_ID?key=kpn_your_key\`
3. Set **Method** to \`POST\`
4. Set **Body type** to \`Raw\`, **Content type** to \`JSON\`
5. Set **Request content** to: \`{"message": "Your message"}\`

---

## Widget Chat

SSE streaming endpoint for the embeddable chat widget. Can also be used directly for custom chat UIs.

### Send Message (Streaming)

\`\`\`
POST /api/widget/chat
\`\`\`

**Authentication:** Bearer token or \`?key=\` query parameter.

### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`message\` | string | Yes | The message to send (1–10,000 chars) |
| \`history\` | array | No | Conversation history (max 50 messages) |
| \`sessionId\` | string | No | Reuse an existing session |

### History Item

| Field | Type | Required |
|-------|------|----------|
| \`role\` | \`"user"\` or \`"assistant"\` | Yes |
| \`content\` | string | Yes |

### SSE Event Stream

The response is a Server-Sent Events stream with typed events:

| Event | Data | Description |
|-------|------|-------------|
| \`status\` | \`{"status": "thinking"}\` | Agent is processing |
| \`token\` | \`{"text": "Hello"}\` | A text token from the agent |
| \`tool_start\` | \`{"name": "search_files"}\` | A tool call started |
| \`tool_end\` | \`{"name": "search_files", "isError": false}\` | A tool call completed |
| \`done\` | \`{"metrics": {...}}\` | Response complete |
| \`error\` | \`{"message": "..."}\` | An error occurred |

### Done Event Metrics

\`\`\`json
{
  "metrics": {
    "inputTokens": 156,
    "outputTokens": 423,
    "estimatedCost": 0.0023
  }
}
\`\`\`

### CORS

The widget endpoint supports CORS. Allowed origins are configured in the widget settings. If no origins are configured, all origins are accepted.

### Example: JavaScript (EventSource)

\`\`\`javascript
const response = await fetch("https://kopern.ai/api/widget/chat?key=kpn_your_key", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Hello!",
    history: []
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const json = JSON.parse(line.slice(6));

    switch (json.type || Object.keys(json)[0]) {
      case "token":
        process.stdout.write(json.data?.text || "");
        break;
      case "done":
        console.log("\\nDone:", json.data?.metrics);
        break;
      case "error":
        console.error("Error:", json.data?.message);
        break;
    }
  }
}
\`\`\`

---

## Widget Config

Retrieve the widget configuration for rendering the chat bubble.

### Get Widget Config

\`\`\`
GET /api/widget/config?key=kpn_your_key
\`\`\`

**Authentication:** \`?key=\` query parameter only.

### Response

\`\`\`json
{
  "welcomeMessage": "Hi! How can I help you?",
  "position": "bottom-right",
  "showPoweredBy": true,
  "agentName": "Support Agent"
}
\`\`\`

| Field | Type | Description |
|-------|------|-------------|
| \`welcomeMessage\` | string | The greeting shown when the widget opens |
| \`position\` | string | \`"bottom-right"\` or \`"bottom-left"\` |
| \`showPoweredBy\` | boolean | Whether "Powered by Kopern" is displayed |
| \`agentName\` | string | The agent's display name |

---

## Widget Script

Serve the embeddable widget JavaScript for use on external websites.

### Get Widget Script

\`\`\`
GET /api/widget/script?key=kpn_your_key
\`\`\`

Returns the widget JavaScript (~15KB). Embed it on your site:

\`\`\`html
<script
  src="https://kopern.ai/api/widget/script?key=kpn_your_key"
  data-key="kpn_your_key"
  async>
</script>
\`\`\`

The widget renders in a Shadow DOM for CSS isolation, supports markdown, and is mobile-responsive (full-screen below 640px).

---

## MCP Server (Streamable HTTP)

Full MCP protocol implementation (spec 2024-11-05) for use with Claude Code, Cursor, Windsurf, or any MCP client.

### Endpoint

\`\`\`
POST /api/mcp/server
\`\`\`

**Authentication:** Bearer token or \`?key=\` query parameter.

### Protocol

The endpoint implements MCP's Streamable HTTP transport. Requests and responses use JSON-RPC 2.0.

### Supported Methods

| Method | Description |
|--------|-------------|
| \`initialize\` | Handshake — returns protocol version and capabilities |
| \`tools/list\` | List available tools (kopern_chat, kopern_agent_info) |
| \`tools/call\` | Execute a tool |
| \`ping\` | Keepalive check |

### Initialize

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": { "name": "your-client", "version": "1.0" }
  },
  "id": 1
}
\`\`\`

Response:

\`\`\`json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "kopern-mcp", "version": "1.0.0" }
  },
  "id": 1
}
\`\`\`

### Tools List

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
\`\`\`

Response:

\`\`\`json
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "kopern_chat",
        "description": "Send a message to the agent and get a response.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "message": { "type": "string", "description": "The message to send" },
            "history": {
              "type": "array",
              "description": "Optional conversation history",
              "items": {
                "type": "object",
                "properties": {
                  "role": { "type": "string", "enum": ["user", "assistant"] },
                  "content": { "type": "string" }
                },
                "required": ["role", "content"]
              }
            }
          },
          "required": ["message"]
        }
      },
      {
        "name": "kopern_agent_info",
        "description": "Get metadata about the agent.",
        "inputSchema": {
          "type": "object",
          "properties": {},
          "required": []
        }
      }
    ]
  },
  "id": 2
}
\`\`\`

### Tools Call — kopern_chat

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "kopern_chat",
    "arguments": {
      "message": "What files are in the src directory?"
    }
  },
  "id": 3
}
\`\`\`

Response:

\`\`\`json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "The src directory contains..."
      }
    ]
  },
  "id": 3
}
\`\`\`

### MCP Client Configuration

Add this to your \`.mcp.json\` (Claude Code, Cursor, etc.):

\`\`\`json
{
  "mcpServers": {
    "my-kopern-agent": {
      "type": "http",
      "url": "https://kopern.ai/api/mcp/server",
      "headers": {
        "Authorization": "Bearer kpn_your_key"
      }
    }
  }
}
\`\`\`

---

## API Key Management

Create, rotate, and delete API keys programmatically. These endpoints require **Firebase Auth** (not API key auth) — they are intended for dashboard integrations.

### Create API Key

\`\`\`
POST /api/mcp/keys
\`\`\`

**Authentication:** Firebase ID token (Bearer).

### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`agentId\` | string | Yes | The agent to bind the key to |
| \`name\` | string | Yes | Human-readable name for the key |
| \`description\` | string | No | Optional description |
| \`rateLimitPerMinute\` | number | No | Custom rate limit (default: 60) |

### Response

\`\`\`json
{
  "serverId": "abc123def456",
  "apiKey": "kpn_a1b2c3d4e5f6...",
  "apiKeyPrefix": "kpn_a1b2"
}
\`\`\`

> **Important:** The full \`apiKey\` is returned **only once**. Store it securely.

### Rotate API Key

\`\`\`
PUT /api/mcp/keys
\`\`\`

**Authentication:** Firebase ID token (Bearer).

### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`agentId\` | string | Yes | The agent ID |
| \`serverId\` | string | Yes | The MCP server ID to rotate |

### Response

\`\`\`json
{
  "apiKey": "kpn_new_key_here...",
  "apiKeyPrefix": "kpn_newk"
}
\`\`\`

The old key is disabled immediately with an audit trail (\`rotatedTo\`, \`rotatedAt\`).

### Delete API Key

\`\`\`
DELETE /api/mcp/keys?agentId=AGENT_ID&serverId=SERVER_ID
\`\`\`

**Authentication:** Firebase ID token (Bearer).

### Response

\`\`\`json
{
  "success": true
}
\`\`\`

---

## Slack Bot

Connect your Kopern agent to Slack. The bot responds to mentions and DMs in your workspace.

### Installation Flow

1. **Generate install URL:** \`GET /api/slack/install?agentId=AGENT_ID\` — returns the Slack OAuth URL
2. **User authorizes:** Slack redirects to \`/api/slack/oauth\` with an authorization code
3. **Token stored:** Kopern exchanges the code for a bot token, stores it encrypted
4. **Bot active:** The agent now responds to \`@mentions\` and DMs

### Events Endpoint

\`\`\`
POST /api/slack/events
\`\`\`

This endpoint receives Slack Events API payloads. It is configured automatically during installation. Kopern handles:

- **URL verification** — responds to Slack's challenge
- **App mentions** — when someone \`@mentions\` the bot in a channel
- **Direct messages** — when someone DMs the bot
- **Thread replies** — maintains conversation context within threads

### How It Works

1. Slack sends an event to \`/api/slack/events\`
2. Kopern verifies the \`X-Slack-Signature\` header using \`SLACK_SIGNING_SECRET\`
3. Looks up the Slack team in the \`slackTeams/{teamId}\` index for O(1) routing
4. Loads the bound agent and runs \`runAgentWithTools()\`
5. Posts the response back to Slack in the same thread
6. Adds a checkmark reaction on the original message

### Message Formatting

Kopern automatically converts markdown to Slack \`mrkdwn\` format:
- \`**bold**\` → \`*bold*\`
- \`*italic*\` → \`_italic_\`
- Tables → key-value pairs
- Code blocks preserved as-is

---

## Telegram Bot

Connect your Kopern agent to Telegram.

### Setup

1. Create a bot with \`@BotFather\` on Telegram and get the bot token
2. In the Kopern dashboard, go to **Agent > Connectors > Telegram**
3. Paste the bot token — Kopern calls \`setWebhook\` automatically

### Webhook Endpoint

\`\`\`
POST /api/telegram/webhook
\`\`\`

This endpoint receives Telegram Bot API updates. Kopern handles:

- **Text messages** — processes and replies in the same chat
- **Token verification** — validates the webhook token matches the configured bot

---

## WhatsApp

Connect your Kopern agent to WhatsApp via Meta's Cloud API.

### Setup

1. Set up a Meta Business account and WhatsApp Business Platform
2. Get your **Phone Number ID** and **Access Token**
3. In the Kopern dashboard, go to **Agent > Connectors > WhatsApp**
4. Enter your credentials — Kopern configures the webhook automatically

### Webhook Endpoints

**Verification (for webhook registration):**

\`\`\`
GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
\`\`\`

**Message handling:**

\`\`\`
POST /api/whatsapp/webhook
\`\`\`

Receives WhatsApp Cloud API webhook payloads. Kopern handles:

- **Text messages** — processes and replies via the Cloud API
- **Signature verification** — validates \`X-Hub-Signature-256\` header

---

## Health Check

Simple liveness check for monitoring.

### Check Health

\`\`\`
GET /api/health
\`\`\`

**Authentication:** None required.

### Response

\`\`\`json
{
  "status": "ok",
  "timestamp": "2026-03-25T14:30:00.000Z"
}
\`\`\`

---

## Outbound Webhooks

Kopern can send webhook notifications to external URLs when events occur during agent execution. Outbound webhooks are configured in the dashboard.

### Event Types

| Event | Trigger |
|-------|---------|
| \`message_sent\` | Agent sends a response |
| \`tool_call_completed\` | A tool finishes executing |
| \`session_ended\` | A conversation session completes |
| \`error\` | An error occurs during execution |

### Payload Format

\`\`\`json
{
  "event": "message_sent",
  "agentId": "abc123",
  "timestamp": "2026-03-25T14:30:00.000Z",
  "data": {
    "response": "The agent's response text",
    "metrics": {
      "inputTokens": 156,
      "outputTokens": 423
    }
  }
}
\`\`\`

### HMAC Signature

If a secret is configured, outbound webhooks include an \`X-Webhook-Signature\` header with an HMAC-SHA256 signature of the payload body.

### Verification Example (Node.js)

\`\`\`javascript
import crypto from "crypto";

function verifySignature(body, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your webhook handler:
const isValid = verifySignature(
  JSON.stringify(req.body),
  req.headers["x-webhook-signature"],
  "your_webhook_secret"
);
\`\`\`

### Anti-Loop Protection

Outbound webhooks are **never fired** from:
- Inbound webhook calls
- Widget chat
- Slack, Telegram, or WhatsApp messages
- MCP server calls
- OpenAI-compatible endpoint calls

This prevents infinite loops where an outbound webhook triggers an inbound call that triggers another outbound webhook.

---

## SDK Examples

### Python — Full Conversation

\`\`\`python
import requests

BASE = "https://kopern.ai"
AGENT_ID = "your_agent_id"
API_KEY = "kpn_your_key"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# Turn 1
r1 = requests.post(
    f"{BASE}/api/webhook/{AGENT_ID}",
    headers=HEADERS,
    json={"message": "My name is Alice"},
)
print(r1.json()["response"])

# Turn 2 (webhook is stateless — each call is independent)
r2 = requests.post(
    f"{BASE}/api/webhook/{AGENT_ID}",
    headers=HEADERS,
    json={"message": "What tools do you have?"},
)
print(r2.json()["response"])
\`\`\`

### Node.js — Streaming with OpenAI SDK

\`\`\`javascript
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "kpn_your_key",
  baseURL: "https://kopern.ai/api/agents/YOUR_AGENT_ID/v1",
});

async function chat(userMessage) {
  const stream = await client.chat.completions.create({
    model: "kopern",
    messages: [{ role: "user", content: userMessage }],
    stream: true,
  });

  let fullResponse = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    process.stdout.write(content);
    fullResponse += content;
  }
  console.log(); // newline
  return fullResponse;
}

await chat("Explain the architecture of this project");
\`\`\`

### cURL — Widget Chat (SSE)

\`\`\`bash
curl -N -X POST "https://kopern.ai/api/widget/chat?key=kpn_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello, what can you help me with?",
    "history": []
  }'
\`\`\`

### Go — Webhook Integration

\`\`\`go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func main() {
    payload := map[string]interface{}{
        "message": "Analyze the latest deployment logs",
        "metadata": map[string]string{
            "environment": "production",
        },
    }

    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest(
        "POST",
        "https://kopern.ai/api/webhook/YOUR_AGENT_ID",
        bytes.NewReader(body),
    )
    req.Header.Set("Authorization", "Bearer kpn_your_key")
    req.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    data, _ := io.ReadAll(resp.Body)
    fmt.Println(string(data))
}
\`\`\`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-03-25 | Added OpenAI-Compatible endpoint (\`/v1/chat/completions\`) |
| 2026-03-20 | Added Telegram and WhatsApp connectors |
| 2026-03-15 | Added Slack bot connector |
| 2026-03-12 | Added webhook inbound/outbound with HMAC |
| 2026-03-10 | Added embeddable widget (chat, config, script) |
| 2026-03-01 | Added MCP Streamable HTTP server |
| 2026-02-15 | Initial API with MCP legacy endpoint |
`;
