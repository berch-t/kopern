export const docsMarkdown = `
## Introduction

Kopern is an AI Agent Builder & Grader platform. It lets you create custom business AI agents, validate them through deterministic grading pipelines, and expose them as API endpoints.

### Key Capabilities

- **Multi-model support** — Anthropic, OpenAI, Google Gemini, Ollama (local)
- **Deterministic grading** — 6 criterion types to validate agent outputs
- **API endpoints** — Expose agents as JSON-RPC services with key auth
- **Real-time** — Firestore subscriptions, SSE streaming chat
- **Extensible** — Skills, custom tools, and extensions

---

## Agents

An agent is the core entity in Kopern. It combines a model configuration with a system prompt, skills, tools, and extensions.

### Creating an Agent

1. Navigate to **Agents** > **New Agent**
2. Fill in the configuration:
   - **Name** — A human-readable identifier
   - **Description** — What the agent does
   - **Domain** — Category (accounting, legal, devops, support, sales, etc.)
3. Select the model:
   - **Provider** — \`anthropic\`, \`openai\`, \`google\`, \`ollama\`
   - **Model ID** — e.g. \`claude-sonnet-4-5-20250514\`, \`gpt-4o\`, \`gemini-2.0-flash\`
   - **Thinking Level** — \`off\`, \`minimal\`, \`low\`, \`medium\`, \`high\`, \`xhigh\`
4. Write the system prompt
5. Save — the agent is created at version 1

### Agent Configuration

\`\`\`typescript
interface AgentDoc {
  name: string;
  description: string;
  domain: string;
  systemPrompt: string;
  modelProvider: string;       // "anthropic" | "openai" | "google" | "ollama"
  modelId: string;
  thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  builtinTools: string[];      // ["read", "bash", ...]
  version: number;
  isPublished: boolean;
  latestGradingScore: number | null;
}
\`\`\`

### Versioning

Each agent has a \`version\` number. When you publish, a snapshot of the current configuration is saved as a \`VersionDoc\`. Grading runs are tied to specific versions so you can track regression.

---

## Skills

Skills are **reusable knowledge blocks** injected into the agent's system prompt. They allow you to modularize instructions without bloating the main prompt.

### How Skills Work

Skills are markdown templates stored in Firestore. At runtime, they are injected into the system prompt as XML:

\`\`\`xml
<skills>
  <skill name="tone-guide">
    Always respond in a professional, concise manner.
    Use bullet points for lists.
  </skill>

  <skill name="code-review-checklist">
    When reviewing code, check for:
    - Security vulnerabilities (XSS, injection)
    - Performance issues
    - Code style consistency
    - Test coverage
  </skill>
</skills>
\`\`\`

### Creating a Skill

1. Go to **Agent Detail** > **Skills**
2. Click **New Skill**
3. Fill in:
   - **Name** — identifier (used in the XML tag)
   - **Description** — what this skill provides
   - **Content** — the markdown/text content to inject
4. Save — the skill is immediately available in the agent

### Skill Examples

**Tone Guide:**
\`\`\`markdown
You are a helpful assistant for a fintech company.
- Be concise and professional
- Use technical terms when appropriate
- Always cite relevant regulations when discussing compliance
\`\`\`

**Output Format:**
\`\`\`markdown
Always structure your responses as:
1. **Summary** — One-line answer
2. **Details** — Full explanation
3. **Next Steps** — Actionable recommendations
\`\`\`

---

## Tools

Tools give your agent the ability to **execute actions** during a conversation. Each tool has a JSON Schema for parameters and JavaScript code for execution.

### Built-in Tools

Agents come with optional built-in tools:
- \`read\` — Read file contents
- \`bash\` — Execute shell commands

### Custom Tools

You can define custom tools with:
- **Name** — Tool identifier (called by the LLM)
- **Label** — Display name
- **Description** — What the tool does (shown to the LLM)
- **Parameters Schema** — JSON Schema defining expected inputs
- **Execute Code** — JavaScript function body

### Tool Schema Example

\`\`\`json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query"
    },
    "limit": {
      "type": "number",
      "description": "Maximum results to return",
      "default": 10
    }
  },
  "required": ["query"]
}
\`\`\`

### Tool Execution Code Example

\`\`\`javascript
// The 'params' object contains the validated parameters
const response = await fetch(
  \\\`https://api.example.com/search?q=\\\${encodeURIComponent(params.query)}&limit=\\\${params.limit}\\\`
);
const data = await response.json();
return JSON.stringify(data.results);
\`\`\`

---

## Extensions

Extensions are **TypeScript modules** that hook into agent events to add custom behaviors. They can intercept messages, modify outputs, add slash commands, and persist state.

### Extension Structure

\`\`\`typescript
// Extension code runs in a sandboxed environment
export default {
  name: "my-extension",
  description: "Adds custom behavior",
  enabled: true,

  // Called when the agent starts
  onAgentStart(context) {
    console.log("Agent started:", context.agentId);
  },

  // Called before each turn
  onTurnStart(context) {
    // Can modify the message before processing
  },

  // Called after each turn
  onTurnEnd(context, response) {
    // Can modify or log the response
  },
};
\`\`\`

### Use Cases

- **Logging** — Track all agent interactions
- **Content filtering** — Block or modify unsafe outputs
- **Custom commands** — Add slash commands like \`/reset\` or \`/export\`
- **State management** — Persist conversation state across sessions

---

## Playground

The Playground is a **live chat interface** for testing your agent. It uses Server-Sent Events (SSE) for real-time streaming.

### Features

- **Real-time streaming** — Tokens appear as the LLM generates them
- **Markdown rendering** — Agent responses are rendered with full markdown support
- **Tool call visualization** — See which tools the agent calls and their results
- **Message history** — Full conversation context is maintained
- **Stream indicator** — Visual feedback while the agent is thinking

### How It Works

\`\`\`text
User message → POST /api/agents/[agentId]/chat
                    ↓
              Build system prompt + inject skills
                    ↓
              streamLLM(provider, model, messages)
                    ↓
              SSE stream: status → token → token → ... → done
                    ↓
              Rendered in real-time in the UI
\`\`\`

### Testing Tips

1. Start with simple queries to verify the system prompt works
2. Test edge cases that should trigger specific skills
3. Verify tool calls are happening when expected
4. Check that the thinking level produces appropriate reasoning depth

---

## Grading

The grading system provides **deterministic validation** of agent outputs. It lets you create test suites, define criteria, and track quality over time.

### Concepts

- **Suite** — A collection of test cases (e.g. "Customer Support Tests")
- **Case** — A single test with input, expected behavior, and criteria
- **Criterion** — A specific validation rule with a weight
- **Run** — An execution of a suite, producing results and a score

### Criterion Types

#### 1. Output Match
Checks if the agent output matches a pattern.

\`\`\`json
{
  "type": "output_match",
  "config": {
    "pattern": "regex or substring",
    "mode": "contains"
  }
}
\`\`\`

#### 2. Schema Validation
Validates the output against a JSON Schema (using ajv).

\`\`\`json
{
  "type": "schema_validation",
  "config": {
    "schema": {
      "type": "object",
      "required": ["summary", "recommendations"],
      "properties": {
        "summary": { "type": "string" },
        "recommendations": { "type": "array" }
      }
    }
  }
}
\`\`\`

#### 3. Tool Usage
Asserts that specific tools were called during execution.

\`\`\`json
{
  "type": "tool_usage",
  "config": {
    "requiredTools": ["search", "calculate"],
    "mode": "all"
  }
}
\`\`\`

#### 4. Safety Check
Detects harmful patterns in the output (XSS, injection, etc.).

\`\`\`json
{
  "type": "safety_check",
  "config": {
    "checks": ["xss", "sql_injection", "prompt_injection"]
  }
}
\`\`\`

#### 5. Custom Script
Runs arbitrary JavaScript evaluation against the output.

\`\`\`javascript
// 'output' is the agent's response string
// 'toolCalls' is an array of tool call records
// Return { passed: boolean, score: number, message: string }

const hasGreeting = output.toLowerCase().includes("hello");
const isShort = output.length < 500;

return {
  passed: hasGreeting && isShort,
  score: hasGreeting && isShort ? 1.0 : 0.0,
  message: hasGreeting ? "Greeting found" : "Missing greeting"
};
\`\`\`

#### 6. LLM Judge
Uses another LLM to evaluate the output quality.

\`\`\`json
{
  "type": "llm_judge",
  "config": {
    "prompt": "Rate the following response for helpfulness and accuracy on a scale of 0-10.",
    "provider": "anthropic",
    "model": "claude-sonnet-4-5-20250514"
  }
}
\`\`\`

### Scoring

Each criterion has a **weight**. The final score is a weighted average:

\`\`\`text
score = Σ (criterion_score × criterion_weight) / Σ (criterion_weight)
\`\`\`

A case passes if **all criteria pass**. The suite score is the average of all case scores.

### Running a Suite

1. Go to **Agent Detail** > **Grading**
2. Select or create a test suite
3. Add test cases with criteria
4. Click **Run** — each case is executed against the agent
5. View results: per-case scores, criteria details, agent output

---

## MCP Servers

MCP (Model Context Protocol) servers let you **expose agents as API endpoints** that external applications can call.

### Architecture

\`\`\`
External App → POST /api/mcp (Bearer token)
                    ↓
              Hash API key → lookup apiKeys/{hash}
                    ↓
              Validate: enabled? rate limit?
                    ↓
              Load agent config + skills
                    ↓
              Build system prompt → call LLM
                    ↓
              Count tokens → track usage
                    ↓
              JSON-RPC response
\`\`\`

### Creating a Server

1. Go to **Agent Detail** > **MCP Servers**
2. Click **New Server**
3. Enter a **name** and **description**
4. Copy the API key (shown once only!)

### API Key Security

- Keys are prefixed with \`kpn_\` followed by 32 random hex bytes
- Only the **SHA-256 hash** is stored in Firestore
- The \`apiKeyPrefix\` (first 12 chars) is stored for display
- Keys are looked up via a top-level \`apiKeys/{hash}\` collection (O(1))
- The plaintext key is returned **once** at creation and **never stored**

### JSON-RPC Endpoint

**URL:** \`POST /api/mcp\`

**Headers:**
\`\`\`
Authorization: Bearer kpn_your_api_key_here
Content-Type: application/json
\`\`\`

#### Method: \`initialize\`

Returns agent metadata.

\`\`\`json
// Request
{"jsonrpc": "2.0", "method": "initialize", "id": 1}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "name": "My Agent",
    "description": "A helpful assistant",
    "model": {"provider": "anthropic", "id": "claude-sonnet-4-5-20250514"}
  },
  "id": 1
}
\`\`\`

#### Method: \`completion/create\`

Sends a message and returns the full response.

\`\`\`json
// Request
{
  "jsonrpc": "2.0",
  "method": "completion/create",
  "params": {
    "message": "Analyze this code for security issues",
    "history": [
      {"role": "user", "content": "Hello"},
      {"role": "assistant", "content": "Hi! How can I help?"}
    ]
  },
  "id": 2
}

// Response
{
  "jsonrpc": "2.0",
  "result": {
    "content": "I'll analyze the code for security vulnerabilities...",
    "usage": {"inputTokens": 245, "outputTokens": 512}
  },
  "id": 2
}
\`\`\`

### Usage Tracking

Usage is tracked per month with atomic increments (no read-before-write):
- **inputTokens** — Estimated input token count
- **outputTokens** — Estimated output token count
- **requestCount** — Number of API calls
- **lastRequestAt** — Timestamp of the last request

### Rate Limiting

Each server has a \`rateLimitPerMinute\` setting (default: 60). Configure it per server based on your needs.

### cURL Examples

**Bash / Linux / macOS:**
\`\`\`bash
curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer kpn_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"completion/create","params":{"message":"Hello"},"id":1}'
\`\`\`

**PowerShell:**
\`\`\`powershell
Invoke-WebRequest -Uri "https://your-domain.com/api/mcp" \`
  -Method POST -UseBasicParsing \`
  -Headers @{"Authorization"="Bearer kpn_your_key";"Content-Type"="application/json"} \`
  -Body '{"jsonrpc":"2.0","method":"completion/create","params":{"message":"Hello"},"id":1}'
\`\`\`

---

## Configuration

### Environment Variables

\`\`\`bash
# Firebase Client (public, used in browser)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (server-side only, for API routes)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"

# LLM API Keys (add the providers you use)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AI...
OLLAMA_BASE_URL=http://localhost:11434
\`\`\`

### Firestore Security Rules

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny
    match /{document=**} { allow read, write: if false; }

    // API keys — admin SDK only
    match /apiKeys/{keyHash} { allow read, write: if false; }

    // User data — owner only
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      match /agents/{agentId} {
        allow read, write: if request.auth.uid == userId;
        // + skills, tools, extensions, versions, gradingSuites, mcpServers
        // Usage subcollection: read-only for owner
      }
    }
  }
}
\`\`\`

### Authentication

Kopern supports three auth methods via Firebase:
- **Google OAuth** — One-click sign-in
- **GitHub OAuth** — Developer-friendly
- **Email/Password** — Traditional sign-up

---

## Workflow

### Recommended Development Flow

\`\`\`text
1. Create Agent
   └── Define name, domain, model, system prompt

2. Add Skills
   └── Modularize instructions (tone, format, domain knowledge)

3. Add Custom Tools (optional)
   └── Give the agent capabilities (API calls, calculations)

4. Test in Playground
   └── Iterate on prompt and skills until behavior is correct

5. Create Grading Suite
   └── Define test cases with criteria

6. Run Grading
   └── Validate deterministically, check score

7. Iterate (steps 2-6)
   └── Improve until grading score meets threshold

8. Publish Version
   └── Snapshot the current config

9. Deploy as MCP Server
   └── Create API endpoint, distribute key

10. Monitor Usage
    └── Track tokens, requests, errors
\`\`\`

### Best Practices

- **Start with the system prompt** — Get the core behavior right first
- **Use skills for reusable patterns** — Don't repeat instructions across agents
- **Write grading cases for edge cases** — Test failure modes, not just happy paths
- **Use LLM Judge sparingly** — Prefer deterministic criteria when possible
- **Set appropriate rate limits** — Match expected traffic patterns
- **Regenerate keys periodically** — Rotate API keys for security
- **Version before publishing** — Always have a rollback point

---

## Examples

### Example 1: Customer Support Agent

**System Prompt:**
\`\`\`text
You are a customer support agent for an e-commerce platform.
You help customers with order tracking, returns, and product questions.
Always be polite, empathetic, and solution-oriented.
If you don't know the answer, escalate to a human agent.
\`\`\`

**Skills:**
- \`tone-guide\` — Professional, empathetic tone
- \`return-policy\` — Company return policy details
- \`escalation-rules\` — When to escalate to humans

**Grading Case:**
\`\`\`text
Input: "I want to return my order, it arrived damaged"
Expected: Apologize, ask for order number, explain return process
Criteria:
  - output_match: contains "sorry" or "apologize" (weight: 0.3)
  - output_match: asks for order number (weight: 0.3)
  - safety_check: no harmful content (weight: 0.2)
  - llm_judge: helpful and empathetic (weight: 0.2)
\`\`\`

### Example 2: Code Review Agent

**System Prompt:**
\`\`\`text
You are an expert code reviewer. When given code:
1. Identify security vulnerabilities
2. Check for performance issues
3. Suggest improvements
4. Rate overall quality (1-10)

Always output structured JSON with your analysis.
\`\`\`

**Tools:**
- \`analyze_complexity\` — Calculate cyclomatic complexity
- \`check_dependencies\` — Verify dependency versions

**Grading Case:**
\`\`\`text
Input: "Review this function: function login(user, pass) { db.query('SELECT * FROM users WHERE name='+user) }"
Criteria:
  - output_match: mentions "SQL injection" (weight: 0.4)
  - schema_validation: output is valid JSON with "vulnerabilities" array (weight: 0.3)
  - tool_usage: calls analyze_complexity (weight: 0.1)
  - safety_check: no harmful code in output (weight: 0.2)
\`\`\`

### Example 3: MCP Integration

**Node.js client:**
\`\`\`javascript
const response = await fetch("https://your-domain.com/api/mcp", {
  method: "POST",
  headers: {
    "Authorization": "Bearer kpn_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "completion/create",
    params: { message: "Analyze this pull request..." },
    id: 1,
  }),
});

const { result } = await response.json();
console.log(result.content);
console.log(\\\`Tokens used: \\\${result.usage.inputTokens + result.usage.outputTokens}\\\`);
\`\`\`

**Python client:**
\`\`\`python
import requests

response = requests.post(
    "https://your-domain.com/api/mcp",
    headers={
        "Authorization": "Bearer kpn_your_api_key",
        "Content-Type": "application/json",
    },
    json={
        "jsonrpc": "2.0",
        "method": "completion/create",
        "params": {"message": "Summarize this document..."},
        "id": 1,
    },
)

result = response.json()["result"]
print(result["content"])
\`\`\`

---

## Customization

### Theming

Kopern uses **OKLch colors** with CSS variables. Toggle between light and dark mode from the header or landing page. The theme persists in \`localStorage\`.

### Adding UI Components

Kopern uses shadcn/ui. To add new components:

\`\`\`bash
npx shadcn@latest add [component-name]
\`\`\`

Available but not yet installed: \`switch\`, \`checkbox\`, \`radio-group\`, \`progress\`, \`slider\`, \`alert\`, \`avatar\`, \`popover\`, \`command\`, \`table\`.

### Project Structure

\`\`\`text
src/
├── actions/         # Client-side Firestore mutations
├── app/             # Next.js App Router pages
├── components/      # React components
│   ├── ui/          # shadcn/ui primitives
│   ├── agents/      # Agent-specific components
│   ├── grading/     # Grading UI
│   ├── mcp/         # MCP server components
│   ├── motion/      # Animation wrappers
│   └── layout/      # Sidebar, Header, Breadcrumbs
├── hooks/           # React hooks (useAuth, useFirestore, useSSE)
├── lib/             # Core libraries
│   ├── firebase/    # Firestore schema, auth, admin SDK
│   ├── grading/     # Grading engine + criteria
│   ├── llm/         # Multi-provider streaming client
│   └── mcp/         # API key auth + token counting
└── providers/       # AuthProvider, ThemeProvider
\`\`\`
`;
