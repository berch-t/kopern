export const docsMarkdown = `
## Introduction

Kopern is an AI Agent Builder & Grader platform. Build custom AI agents tailored to your business, validate their quality with deterministic grading, connect them to your GitHub repositories, and deploy them as API endpoints — all from a single dashboard.

### What You Can Do

- **Build agents** for any domain — support, legal, DevOps, sales, finance, HR, and more
- **Connect your code** — agents can read and search your GitHub repositories
- **Validate quality** — run automated test suites with 6 criterion types
- **Deploy as API** — expose agents as JSON-RPC endpoints with secure API keys
- **Track everything** — billing, sessions, conversations, grading runs
- **Team collaboration** — orchestrate multiple agents working together

---

## Quick Start

### 1. Create Your First Agent

1. Go to **Agents** and click **New Agent**
2. Give it a **name**, **description**, and select a **domain**
3. Choose your **model provider** and **model**:
   - Anthropic (Claude Sonnet, Claude Opus)
   - OpenAI (GPT-4o, GPT-4.1)
   - Google (Gemini 2.0 Flash, Gemini 2.5 Pro)
   - Ollama (any local model)
4. Write a **system prompt** — this defines the agent's personality and behavior
5. Save — your agent is ready to test!

### 2. Add Skills

Skills are reusable knowledge blocks that get injected into the agent's system prompt. Think of them as modular instructions.

Go to your agent's **Skills** tab and create skills for:
- **Tone & style** — how the agent communicates
- **Domain knowledge** — specific rules, policies, or procedures
- **Output format** — structured responses (JSON, markdown, bullet points)

### 3. Add Custom Tools

Tools let your agent take real actions during conversations — call APIs, search databases, run calculations.

Go to your agent's **Tools** tab and define:
- **Name** — what the agent calls the tool
- **Description** — what the tool does (the agent reads this to decide when to use it)
- **Parameters** — JSON Schema defining expected inputs
- **Execute code** — JavaScript that runs when the tool is called

### 4. Test in the Playground

Open the **Playground** tab to chat with your agent in real-time:
- See tokens streamed as they're generated
- Watch tool calls happen live with arguments and results
- Track token usage and cost in the metrics bar
- Click **View session** to see the full conversation history later

### 5. Validate with Grading

Create a **Grading Suite** to automatically test your agent's quality:
1. Define test cases with specific inputs
2. Add criteria (pattern matching, schema validation, safety checks, etc.)
3. Run the suite — each case is tested and scored
4. Iterate until your agent meets your quality threshold

### 6. Deploy as API

Create an **MCP Server** to expose your agent as an API:
1. Go to your agent's **MCP Servers** tab
2. Create a new server and copy the API key
3. Call the JSON-RPC endpoint from any application

---

## Agents

### Configuration Options

| Setting | Description |
|---------|-------------|
| **Name** | Human-readable identifier |
| **Description** | What the agent does |
| **Domain** | Category (DevOps, Legal, Support, Sales, Finance, HR, etc.) |
| **Provider** | Anthropic, OpenAI, Google, or Ollama |
| **Model** | Specific model (e.g. claude-sonnet-4-6, gpt-4o, gemini-2.5-pro) |
| **Thinking Level** | Controls reasoning depth: off, minimal, low, medium, high, xhigh |
| **System Prompt** | The core instructions that define agent behavior |
| **Connected Repos** | GitHub repositories the agent can read and search |

### Versioning

Every time you publish an agent, a version snapshot is saved. Grading runs are tied to specific versions so you can track improvements or regressions over time.

### GitHub Integration

Connect your GitHub repositories so agents can:
- **Read files** — access any file in connected repos
- **Search files** — find files by name pattern
- **Understand context** — the repo's file tree and README are automatically included

To connect a repo:
1. Sign in with GitHub (grants the \`repo\` scope)
2. On any agent detail page, click **Connect Repo**
3. Select the repositories you want the agent to access

---

## Skills

Skills are **modular instruction blocks** injected into the agent's context at runtime. They let you separate concerns and reuse knowledge across agents.

### How They Work

When your agent runs, all active skills are wrapped in XML tags and appended to the system prompt:

\`\`\`xml
<skills>
  <skill name="tone-guide">
    Always respond in a professional, concise manner.
    Use bullet points for lists.
  </skill>
  <skill name="escalation-rules">
    Escalate to a human agent when:
    - The customer asks for a refund over $500
    - Legal questions arise
    - The customer expresses frustration 3+ times
  </skill>
</skills>
\`\`\`

### Best Practices

- **Keep skills focused** — one skill per topic (tone, format, domain rules)
- **Write clear instructions** — the LLM follows skills literally
- **Test with grading** — verify skills produce the expected behavior
- **Reuse across agents** — skills can be copied between agents using the Examples gallery

---

## Tools

Tools give your agent the ability to **take actions** during a conversation — call APIs, query databases, perform calculations, or interact with external services.

### Built-in Tools

When you connect GitHub repositories, two built-in tools are automatically available:

| Tool | Description |
|------|-------------|
| **read_file** | Read the content of any file in a connected repository |
| **search_files** | Search for files by name pattern across connected repos |

### Custom Tools

Create your own tools with:

- **Name** — identifier the LLM uses to call the tool
- **Description** — explains what the tool does (the LLM reads this to decide when to use it)
- **Parameters Schema** — JSON Schema defining the expected input

\`\`\`json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Search query" },
    "limit": { "type": "number", "description": "Max results", "default": 10 }
  },
  "required": ["query"]
}
\`\`\`

- **Execute Code** — JavaScript that runs when the tool is called

\`\`\`javascript
const response = await fetch(
  \\\`https://api.example.com/search?q=\\\${encodeURIComponent(params.query)}\\\`
);
const data = await response.json();
return JSON.stringify(data.results);
\`\`\`

### Tool Calling Flow

When the agent decides to use a tool:
1. The LLM generates a tool call with arguments
2. Kopern executes the tool code with those arguments
3. The result is fed back to the LLM
4. The LLM uses the result to formulate its response
5. This can repeat up to 10 iterations in a single turn

---

## Extensions

Extensions are **event hooks** that intercept and modify agent behavior. They can log interactions, filter content, add commands, or persist state.

### Use Cases

- **Logging** — track all agent interactions for compliance
- **Content filtering** — block or modify unsafe outputs
- **Custom commands** — add slash commands like \`/reset\` or \`/export\`
- **State management** — persist data across conversation sessions
- **Guardrails** — enforce business rules on agent responses

---

## Playground

The Playground is your **live testing environment**. Chat with your agent and see everything in real-time.

### Features

| Feature | Description |
|---------|-------------|
| **Streaming** | Tokens appear as the LLM generates them |
| **Tool visualization** | See tool calls, arguments, and results live |
| **Markdown rendering** | Agent responses are rendered with full formatting |
| **Metrics bar** | Track tokens in/out, cost, and tool calls |
| **Session link** | Click to view the full conversation history |
| **Session continuity** | Multiple messages share the same session for tracking |

### Testing Tips

1. **Start simple** — verify the system prompt works with basic queries
2. **Test edge cases** — try inputs that should trigger specific skills or tools
3. **Check tool calls** — make sure the agent uses tools when appropriate
4. **Iterate fast** — edit the prompt/skills, then test again immediately

---

## Grading

The grading system provides **automated quality validation** for your agents. Build test suites, run them, and track scores over time.

### Concepts

| Term | Description |
|------|-------------|
| **Suite** | A collection of test cases (e.g. "Customer Support Tests") |
| **Case** | A single test with an input message and validation criteria |
| **Criterion** | A specific validation rule with a weight |
| **Run** | An execution of the full suite, producing scores |

### 6 Criterion Types

#### 1. Output Match
Check if the agent's response contains (or matches) a specific pattern.

**Example:** Ensure the agent always apologizes when a customer reports a problem.

#### 2. Schema Validation
Validate that the agent's response is valid JSON matching a specific structure.

**Example:** Ensure a code review agent always outputs \`{ "vulnerabilities": [...], "score": number }\`.

#### 3. Tool Usage
Assert that the agent called specific tools during the conversation.

**Example:** Ensure a research agent always uses the \`search_files\` tool before answering.

#### 4. Safety Check
Detect harmful patterns in the output — XSS, SQL injection, prompt injection, etc.

**Example:** Ensure the agent never generates executable code in customer-facing responses.

#### 5. Custom Script
Run arbitrary JavaScript to evaluate the agent's response.

**Example:** Check that the response length is within bounds, or that specific keywords appear in the right order.

#### 6. LLM Judge
Use another LLM to evaluate response quality on subjective criteria.

**Example:** "Rate this response for empathy and helpfulness on a scale of 0-10."

### Scoring

Each criterion has a **weight**. The final score is a weighted average:

\`\`\`
Score = Sum(criterion_score x weight) / Sum(weights)
\`\`\`

A case passes if all criteria pass. The suite score is the average of all case scores. Your agent's latest grading score appears on its detail page.

### Workflow

1. Create a grading suite for your agent
2. Add test cases covering happy paths AND edge cases
3. Add weighted criteria to each case
4. Run the suite
5. Review results — see per-case scores and agent outputs
6. Improve your agent (prompt, skills, tools) and re-run
7. Track progress across versions

---

## MCP Servers (API Deployment)

MCP Servers let you **expose your agent as an API endpoint** that any application can call.

### Creating a Server

1. Go to your agent's **MCP Servers** tab
2. Click **New Server** — give it a name and description
3. Copy the API key (shown only once — save it securely!)

### Calling the API

**Endpoint:** \`POST /api/mcp\`

**Authentication:** Include your API key as a Bearer token.

#### Get Agent Info

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1
}
\`\`\`

#### Send a Message

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "completion/create",
  "params": {
    "message": "Analyze this pull request for security issues",
    "history": [
      {"role": "user", "content": "Hello"},
      {"role": "assistant", "content": "Hi! How can I help?"}
    ]
  },
  "id": 2
}
\`\`\`

### Code Examples

**cURL:**
\`\`\`bash
curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer kpn_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"completion/create","params":{"message":"Hello"},"id":1}'
\`\`\`

**Node.js:**
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
    params: { message: "Analyze this code..." },
    id: 1,
  }),
});
const { result } = await response.json();
console.log(result.content);
\`\`\`

**Python:**
\`\`\`python
import requests

response = requests.post(
    "https://your-domain.com/api/mcp",
    headers={"Authorization": "Bearer kpn_your_api_key"},
    json={"jsonrpc": "2.0", "method": "completion/create",
          "params": {"message": "Summarize this..."}, "id": 1},
)
print(response.json()["result"]["content"])
\`\`\`

### API Key Security

- Keys are prefixed with \`kpn_\` and use 32 random hex bytes
- Only the SHA-256 hash is stored — the plaintext key is shown once at creation
- Each server has configurable rate limiting (requests per minute)

### Usage Tracking

Token usage is tracked per server per month. View usage in the **API Keys** page or in each server's detail page.

---

## Agent Teams

Teams let you **orchestrate multiple agents** working together on a task. Each team member has a role and contributes to a shared goal.

### How Teams Work

1. Create a team and add agents as members
2. Define each member's role and contribution order
3. Execute the team — each agent processes the task in sequence
4. The output of each agent is fed as context to the next
5. Track combined metrics (tokens, cost, tool calls) across all members

### Use Cases

- **Review pipeline** — Writer agent drafts, Reviewer agent critiques, Editor agent finalizes
- **Analysis team** — Data agent gathers info, Analyst agent interprets, Reporter agent summarizes
- **Support escalation** — Tier 1 agent handles common questions, Tier 2 agent handles complex issues

---

## Pipelines

Pipelines let you define **multi-step workflows** for an agent. Each step has a specific prompt and the output flows to the next step.

### How Pipelines Work

1. Create a pipeline on your agent
2. Define steps with specific instructions
3. Execute — each step runs in sequence
4. Each step receives the previous step's output as context
5. Track per-step and total metrics

### Use Cases

- **Content creation** — Research → Outline → Draft → Polish
- **Code review** — Parse → Analyze Security → Check Performance → Generate Report
- **Data processing** — Extract → Transform → Validate → Summarize

---

## Sessions & History

Every playground conversation is tracked as a **session**. Sessions capture the full conversation timeline including messages, tool calls, and metrics.

### Viewing Sessions

1. Go to your agent's **Sessions** tab
2. See all past conversations with:
   - Session title (from your first message)
   - Duration, token count, cost
   - Tool call count
   - Active/Ended status
3. Click any session to see the **full timeline**:
   - Every message (user and assistant)
   - Every tool call with arguments and results
   - Timestamps and metrics
4. **Export** the full session trace as JSON for debugging or compliance

### Session Metrics

| Metric | Description |
|--------|-------------|
| **Tokens In** | Total input tokens consumed |
| **Tokens Out** | Total output tokens generated |
| **Cost** | Estimated cost based on provider pricing |
| **Tool Calls** | Number of tool invocations |
| **Messages** | Total message count |

---

## Billing & Usage

The **Billing** page shows your token usage and costs across all agents.

### What's Tracked

- **Input/Output tokens** per month with running totals
- **Total cost** calculated from provider pricing
- **Request count** — total API/playground calls
- **Per-agent breakdown** — see which agents consume the most
- **Usage history** — visual chart of the last 6 months

### Provider Pricing (per 1M tokens)

| Provider | Input | Output |
|----------|-------|--------|
| Anthropic | $3.00 | $15.00 |
| OpenAI | $2.50 | $10.00 |
| Google | $1.25 | $5.00 |
| Ollama | Free | Free |

---

## Integrations

### GitHub (Native)

Kopern has built-in GitHub integration:
- Sign in with GitHub to grant repository access
- Connect specific repos to specific agents
- Agents can read files and search the file tree
- The repo structure and README are included as context

### External Services (via MCP)

For any other service (Slack, Jira, AWS, Notion, databases, etc.), use **MCP connectors**:
1. Deploy your agent as an MCP Server
2. Call it from any MCP-compatible client
3. Or build custom tools that call external APIs

This makes Kopern infinitely extensible without building custom integrations for each service.

---

## Best Practices

### Agent Design

- **Start with the system prompt** — get core behavior right before adding skills
- **Use skills for reusable patterns** — don't repeat instructions across agents
- **Keep tools focused** — one tool per action, with clear descriptions
- **Connect relevant repos** — give the agent the context it needs

### Quality Assurance

- **Write grading cases for edge cases** — test failure modes, not just happy paths
- **Use deterministic criteria first** — output_match and schema_validation are reliable
- **Use LLM Judge sparingly** — it's powerful but non-deterministic
- **Version before changes** — always have a rollback point
- **Track scores over time** — monitor regression across versions

### API Deployment

- **Set appropriate rate limits** — match expected traffic
- **Rotate API keys periodically** — regenerate keys for security
- **Monitor usage** — check the Billing page regularly
- **Test before deploying** — use the Playground and Grading first

### Security

- API keys are hashed (SHA-256) — plaintext is never stored
- GitHub tokens are stored securely in your user document
- Firestore rules enforce owner-only access to all data
- Tool execution runs in a sandboxed environment
`;
