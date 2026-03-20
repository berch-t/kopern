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

### 6. Optimize with AutoResearch

Once your grading suite is set up, let AutoResearch automatically improve your agent:
1. Go to the **Optimize** tab
2. Select your grading suite and run **AutoTune** to iteratively improve the system prompt
3. Use **Stress Lab** to find vulnerabilities, **Tournament** to compare models, or **Evolution** for multi-dimensional optimization
4. Apply the best result with one click

### 7. Deploy as API

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
| **Provider** | Anthropic, OpenAI, Google, Mistral AI, or Ollama |
| **Model** | Specific model (e.g. claude-sonnet-4-6, gpt-4o, gemini-2.5-pro, mistral-large-latest) |
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

Extensions are **event hooks** that intercept and modify agent behavior at runtime. They fire on specific events during the agent lifecycle — from session start to tool execution, team orchestration, and beyond.

### Creating an Extension

1. Go to your agent's **Extensions** tab
2. Click **Add Extension**
3. Fill in **Name** and **Description**
4. Select one or more **Events** — these determine when your extension code runs
5. Toggle **Blocking** if your extension should be able to prevent actions
6. Write your **Code** — JavaScript that runs when the selected events fire

### How Extension Code Works

Your code has access to:
- \`context.eventType\` — the event that triggered the extension (e.g. \`"tool_call_start"\`)
- \`context.data\` — event-specific data (tool name, arguments, results, errors...)
- \`log(message)\` — log a message for debugging
- \`blocked = true\` — (blocking extensions only) prevent the action from proceeding
- \`blockReason = "..."\` — explain why the action was blocked

### Use Cases

- **Logging** — track all agent interactions for compliance or debugging
- **Content filtering** — block or modify unsafe outputs
- **Guardrails** — enforce business rules, block dangerous commands
- **Cost control** — stop execution when cost exceeds a threshold
- **Notifications** — log important events like PR creation or errors

### Extension Events Reference

Events are grouped by category. **Blocking events** (marked with a shield icon) can prevent the action from proceeding when an extension sets \`blocked = true\`.

#### Session Lifecycle

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`session_start\` | Fired when a new session begins | \`{ sessionId, purpose }\` |
| \`session_end\` | Fired when a session ends | \`{ sessionId, totalTokens, totalCost }\` |
| \`session_compact\` | Fired when context is compacted (long conversations) | \`{ sessionId, messageCount }\` |

#### Message Lifecycle

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`message_start\` | Fired before the LLM processes a user message | \`{ role, content }\` |
| \`message_end\` | Fired after the LLM finishes responding | \`{ role, content, tokensUsed }\` |
| \`message_stream_token\` | Fired for each streamed token (high frequency) | \`{ token }\` |

#### Tool Lifecycle

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`tool_call_start\` | Fired before a tool executes | \`{ toolName, args }\` |
| \`tool_call_end\` | Fired after a tool completes successfully | \`{ toolName, result, isError }\` |
| \`tool_call_error\` | Fired when a tool execution fails | \`{ toolName, error }\` |
| \`tool_call_blocked\` | **Blocking** — can prevent a tool from executing | \`{ toolName, args }\` |

> **Example:** Block dangerous shell commands by checking \`context.data.toolName === "bash"\` and inspecting \`context.data.args.command\` for patterns like \`rm -rf\`.

#### Agent Lifecycle

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`agent_thinking_start\` | Fired when the LLM begins its thinking/reasoning phase | \`{}\` |
| \`agent_thinking_end\` | Fired when thinking completes | \`{ thinkingContent }\` |
| \`agent_response_start\` | Fired when the LLM starts generating its response | \`{}\` |
| \`agent_response_end\` | Fired when response generation completes | \`{ responseLength }\` |

#### Sub-agent Lifecycle

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`sub_agent_spawn\` | Fired when a sub-agent is delegated work | \`{ subAgentId, task }\` |
| \`sub_agent_result\` | Fired when a sub-agent returns its result | \`{ subAgentId, result }\` |
| \`sub_agent_error\` | Fired when a sub-agent encounters an error | \`{ subAgentId, error }\` |

#### Pipeline Lifecycle

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`pipeline_start\` | Fired when a pipeline begins execution | \`{ pipelineId, stepCount }\` |
| \`pipeline_step_start\` | Fired before each step in the pipeline | \`{ pipelineId, stepIndex, stepName }\` |
| \`pipeline_step_end\` | Fired after each step completes | \`{ pipelineId, stepIndex, result }\` |
| \`pipeline_end\` | Fired when the entire pipeline completes | \`{ pipelineId, totalSteps }\` |

#### Team Lifecycle

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`team_execution_start\` | Fired when a team begins execution | \`{ teamId, memberCount }\` |
| \`team_member_start\` | Fired before each team member runs | \`{ teamId, memberId, memberName }\` |
| \`team_member_end\` | Fired after a team member completes | \`{ teamId, memberId, result }\` |
| \`team_execution_end\` | Fired when all team members have completed | \`{ teamId, results }\` |

#### User Interaction

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`user_input\` | **Blocking** — fired when user sends a message | \`{ content }\` |
| \`user_confirm\` | Fired when user confirms a prompted action | \`{ action }\` |
| \`user_deny\` | Fired when user denies a prompted action | \`{ action }\` |

#### System

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`error\` | Fired on any unhandled error during execution | \`{ message, stack }\` |
| \`context_limit_warning\` | Fired when context window usage is near the limit | \`{ usagePercent }\` |
| \`cost_limit_warning\` | **Blocking** — fired when session cost approaches the limit | \`{ totalCost, limit }\` |

> **Example:** Set a cost ceiling by listening to \`cost_limit_warning\` and setting \`blocked = true\` when \`context.data.totalCost > 5.0\`.

#### AutoResearch

| Event | Description | \`context.data\` |
|-------|-------------|-----------------|
| \`autoresearch_run_start\` | Fired when an AutoResearch optimization run begins | \`{ mode, suiteId }\` |
| \`autoresearch_iteration_start\` | Fired before each optimization iteration | \`{ iteration, totalIterations }\` |
| \`autoresearch_iteration_end\` | Fired after each iteration with results | \`{ iteration, score, improved }\` |
| \`autoresearch_mutation\` | Fired when a prompt mutation is applied | \`{ mutationType, diff }\` |
| \`autoresearch_run_end\` | Fired when the optimization run completes | \`{ bestScore, totalIterations }\` |

### Code Examples

**Log all tool calls:**
\`\`\`javascript
log("[" + context.eventType + "] " + (context.data.toolName || ""));
\`\`\`

**Block dangerous bash commands (blocking, on \`tool_call_blocked\`):**
\`\`\`javascript
if (context.data.toolName === "bash") {
  var cmd = String(context.data.args.command || "");
  if (/rm\\s+-rf/i.test(cmd) || /drop\\s+table/i.test(cmd)) {
    blocked = true;
    blockReason = "Dangerous command blocked: " + cmd;
  }
}
\`\`\`

**Cost guard (blocking, on \`cost_limit_warning\`):**
\`\`\`javascript
var maxCost = 5.0;
if (context.data.totalCost > maxCost) {
  blocked = true;
  blockReason = "Cost limit exceeded: $" + context.data.totalCost.toFixed(2);
}
\`\`\`

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

## AutoResearch (Self-Improving Agents)

AutoResearch is Kopern's automated optimization system, inspired by Karpathy's autoresearch. It uses your grading suites as an objective fitness function and iteratively improves your agent's configuration — system prompt, model, thinking level — in a tight feedback loop.

### Prerequisites

Before using AutoResearch, you need:
1. **A configured agent** with a system prompt
2. **At least one grading suite** with test cases and criteria
3. **An initial grading run** (for AutoFix mode)

### Modes

#### AutoTune

The core optimization loop. AutoTune iteratively mutates your agent's system prompt using LLM-guided strategies, grades each variant against your test suite, and keeps only improvements.

1. Go to your agent's **Optimize** tab
2. Select a grading suite and set max iterations (default: 10)
3. Optionally set a target score (e.g., 0.9)
4. Click **Start Run** — watch iterations in real-time
5. When complete, review the best prompt and click **Apply** to update your agent

**How it works:** Each iteration, the optimizer analyzes previous results, generates a mutated prompt, runs grading, and compares scores. Only mutations that improve the score are kept (hill-climbing).

#### AutoFix

Targeted repair for failing test cases. AutoFix analyzes your latest grading results, diagnoses root causes for failures, and patches the system prompt to fix specific weaknesses.

1. Select a grading suite that has at least one completed run
2. Switch to the **AutoFix** tab
3. Click **Start Run** — the analyzer identifies failing cases, diagnoses issues, and applies fixes
4. Review the patched prompt and apply if satisfied

#### Stress Lab

Adversarial testing that probes your agent for vulnerabilities. Stress Lab generates edge cases — prompt injections, ambiguous inputs, boundary conditions — and evaluates your agent's robustness.

1. Switch to the **Stress Lab** tab
2. Select your grading suite
3. Click **Start Run** — the system generates adversarial test cases and runs them
4. Review the security report: total tests, pass rate, robustness score
5. If vulnerabilities are found, click **Apply Hardened Prompt** to automatically strengthen defenses

#### Tournament Arena

A/B testing across multiple model and configuration combinations. Tournament runs your grading suite against different configs and ranks them by quality, cost, and latency.

1. Switch to the **Tournament** tab
2. Select a grading suite
3. Click **Start Run** — candidates compete in multi-round evaluation
4. Review the leaderboard: score, cost per run, and average latency
5. Use results to pick the best quality/cost trade-off for production

#### Evolution Engine

Genetic algorithm-based optimization across multiple dimensions simultaneously — prompt, model, and thinking level. A population of agent configs evolves through mutation, crossover, and selection over generations.

1. Switch to the **Evolution** tab
2. Set max iterations (generations)
3. Click **Start Run** — watch population fitness improve over generations
4. The best-performing config across all dimensions is reported at the end

#### Distillation

Knowledge transfer from expensive teacher models to cheaper students. Distillation runs your grading suite with powerful models, then finds the cheapest model that maintains acceptable quality.

1. Switch to the **Distillation** tab
2. Select your grading suite
3. Click **Start Run** — the system tests progressively cheaper models
4. Review quality retention percentages and cost savings

### Run History

All AutoResearch runs are persisted in Firestore. View past runs at the bottom of the Optimize page — each shows mode, status, score, iteration count, and token usage.

### Billing

AutoResearch runs consume tokens (often many iterations × full grading suite). Usage is tracked per-agent in the Billing page under **AutoResearch Usage**. Plan limits apply.

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

## MCP Integration Tutorial

This tutorial shows how to connect your Kopern agents to third-party services using three approaches: **custom tools** (simplest), **MCP Server deployment** (for external consumers), and **agent teams** (for multi-service orchestration).

### Approach 1: Custom Tools (Recommended for Most Cases)

The fastest way to connect an agent to an external service is via custom tools. The agent calls the tool during conversation, and the tool's JavaScript code communicates with the service.

#### Example: Slack Notification Tool

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "channel": { "type": "string", "description": "Slack channel name (e.g. #general)" },
    "message": { "type": "string", "description": "Message to send" }
  },
  "required": ["channel", "message"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const response = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Authorization": "Bearer xoxb-YOUR-SLACK-BOT-TOKEN",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    channel: params.channel,
    text: params.message,
  }),
});
const data = await response.json();
return data.ok ? "Message sent successfully" : \\\`Error: \\\${data.error}\\\`;
\`\`\`

#### Example: Database Query Tool (Supabase)

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "table": { "type": "string", "description": "Table name" },
    "query": { "type": "string", "description": "Filter expression (e.g. status=eq.active)" },
    "limit": { "type": "number", "description": "Max rows", "default": 10 }
  },
  "required": ["table"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const url = new URL(\\\`https://YOUR-PROJECT.supabase.co/rest/v1/\\\${params.table}\\\`);
if (params.query) url.searchParams.set("select", "*");
if (params.limit) url.searchParams.set("limit", String(params.limit));
const response = await fetch(url.toString(), {
  headers: {
    "apikey": "YOUR-SUPABASE-ANON-KEY",
    "Authorization": "Bearer YOUR-SUPABASE-ANON-KEY",
  },
});
const data = await response.json();
return JSON.stringify(data, null, 2);
\`\`\`

#### Example: Jira Issue Creator

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "project": { "type": "string", "description": "Jira project key (e.g. PROJ)" },
    "summary": { "type": "string", "description": "Issue title" },
    "description": { "type": "string", "description": "Issue description" },
    "issueType": { "type": "string", "enum": ["Bug", "Task", "Story"], "default": "Task" }
  },
  "required": ["project", "summary"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const response = await fetch("https://YOUR-DOMAIN.atlassian.net/rest/api/3/issue", {
  method: "POST",
  headers: {
    "Authorization": "Basic " + btoa("email@example.com:YOUR-API-TOKEN"),
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fields: {
      project: { key: params.project },
      summary: params.summary,
      description: { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: params.description || "" }] }] },
      issuetype: { name: params.issueType || "Task" },
    },
  }),
});
const data = await response.json();
return data.key ? \\\`Created: \\\${data.key}\\\` : JSON.stringify(data.errors);
\`\`\`

### Approach 2: MCP Server (For External Consumers)

When you want **other applications** to call your Kopern agent, deploy it as an MCP Server. This is useful for:
- CI/CD pipelines calling a code review agent
- Chatbots forwarding complex questions to a specialized agent
- Internal tools querying a knowledge agent
- Webhooks triggering agent analysis

See the **MCP Servers (API Deployment)** section above for setup instructions.

**Webhook pattern** — trigger your agent from any service that supports webhooks:

\`\`\`javascript
// Example: GitHub webhook handler calls your Kopern agent
app.post("/webhook/github", async (req, res) => {
  const event = req.body;
  if (event.action === "opened" && event.pull_request) {
    const response = await fetch("https://your-kopern.com/api/mcp", {
      method: "POST",
      headers: {
        "Authorization": "Bearer kpn_your_api_key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "completion/create",
        params: { message: \\\`Review this PR: \\\${event.pull_request.title}\\n\\n\\\${event.pull_request.body}\\\` },
        id: 1,
      }),
    });
    const { result } = await response.json();
    // Post the review as a PR comment
  }
});
\`\`\`

### Approach 3: Agent Teams (Multi-Service Orchestration)

For workflows that span multiple services, create specialized agents and orchestrate them as a **team**:

1. **Slack Monitor Agent** — tool: read Slack messages
2. **Jira Agent** — tool: create/update Jira issues
3. **Summary Agent** — synthesizes results

Create a team with these three agents in sequential mode. When executed, each agent processes the task and passes its output to the next.

### Security Best Practices

- **Never hardcode secrets** in tool code — use environment variables or a secrets manager
- **Use read-only tokens** when the agent only needs to read data
- **Add safety extensions** to block agents from calling tools with dangerous parameters
- **Test tools in the Playground** before connecting to production services
- **Monitor usage** via the Billing page to catch unexpected API calls

---

## Connectors (External Deployment)

Deploy your agents beyond the Kopern dashboard. Connectors let your agents interact with users on websites, respond to external events via webhooks, and join Slack conversations.

### Embeddable Chat Widget

Add an AI chat bubble to any website with a single \`<script>\` tag.

#### Setup

1. Go to **Agents → [Your Agent] → Connectors → Widget**
2. Enable the widget and configure:
   - **Welcome message** — first message shown to visitors
   - **Position** — bottom-right or bottom-left
   - **Allowed origins** — CORS whitelist (leave empty to allow all)
   - **Powered by Kopern** — visible on Starter plan, removable on Pro+
3. Generate an **API key** (same key system as MCP)
4. Copy the embed snippet and paste it into your website's HTML

#### Embed Snippet

\`\`\`html
<script
  src="https://kopern.vercel.app/api/widget/script"
  data-key="kpn_your_api_key_here"
  async
></script>
\`\`\`

#### Features

- **Shadow DOM** — fully isolated CSS, no conflicts with your site
- **SSE streaming** — real-time token-by-token responses
- **Markdown rendering** — headers, bold, italic, code blocks, links, lists
- **Mobile responsive** — full-screen panel on screens < 640px
- **Dark mode** — automatically follows system preference
- **Tool calling** — agent can use all configured tools

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| \`/api/widget/script\` | GET | Serves the widget JavaScript |
| \`/api/widget/config\` | GET | Returns widget configuration (branding, welcome message) |
| \`/api/widget/chat\` | POST | SSE streaming chat (same auth as MCP) |

#### CORS Configuration

By default, the widget allows requests from any origin. For production, add specific origins in the widget configuration:

\`\`\`
https://mysite.com
https://app.mysite.com
\`\`\`

Each origin must include the protocol (\`https://\`).

### Webhooks

Connect your agents to external services (Stripe, Jira, n8n, Zapier...) via HTTP webhooks.

#### Inbound Webhooks

External services send data to your agent, which processes the message and returns a JSON response.

**Endpoint:** \`POST /api/webhook/{agentId}?key=kpn_xxx\`

**Request:**
\`\`\`json
{
  "message": "New order #1234 placed for $99.99",
  "metadata": {
    "orderId": "1234",
    "source": "stripe"
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "response": "I've noted the new order #1234...",
  "metrics": {
    "inputTokens": 1250,
    "outputTokens": 85,
    "toolCallCount": 0
  }
}
\`\`\`

#### HMAC Signature Verification

For security, you can configure a signing secret on your webhook. The sender must include an \`X-Webhook-Signature\` header with the HMAC-SHA256 signature of the request body.

#### Outbound Webhooks

Your agent automatically notifies external services when events occur:

| Event | Trigger |
|-------|---------|
| \`message_sent\` | Agent sends a response |
| \`tool_call_completed\` | Agent finishes using a tool |
| \`session_ended\` | Conversation session ends |
| \`error\` | An error occurs during processing |

**Outbound payload:**
\`\`\`json
{
  "event": "message_sent",
  "agentId": "abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "inputTokens": 1250,
    "outputTokens": 85,
    "toolCallCount": 1
  }
}
\`\`\`

#### Webhook Logs

All webhook executions (inbound and outbound) are logged with direction, status, HTTP status code, duration, and timestamp. View logs in **Agents → [Your Agent] → Connectors → Webhooks → Logs tab**.

### Slack Bot

Let users interact with your agent directly in Slack channels and DMs.

#### Setup

1. **Create a Slack App** at [api.slack.com/apps](https://api.slack.com/apps)
2. Configure **OAuth Scopes**: \`chat:write\`, \`app_mentions:read\`, \`channels:history\`, \`im:history\`, \`reactions:write\`
3. Set **Event Subscriptions** URL: \`https://kopern.vercel.app/api/slack/events\`
4. Subscribe to events: \`app_mention\`, \`message.im\`
5. Add environment variables: \`SLACK_CLIENT_ID\`, \`SLACK_CLIENT_SECRET\`, \`SLACK_SIGNING_SECRET\`
6. Go to **Agents → [Your Agent] → Connectors → Slack → Connect**
7. Authorize the bot in your Slack workspace

#### How It Works

- **@mention** the bot in any channel → agent responds in a thread
- **Direct message** the bot → agent responds directly
- **Thread replies** maintain conversation context (full thread history is sent to the agent)
- The bot adds 👀 reaction while thinking, then ✅ when done

#### Security

- All incoming events are verified using Slack's signing secret (HMAC-SHA256)
- Bot tokens are stored securely in Firestore (server-side only)
- Events return 200 immediately, processing happens asynchronously (Slack requires < 3s response)

### Connector Plan Limits

| Feature | Starter | Pro | Usage | Enterprise |
|---------|---------|-----|-------|-----------|
| Connectors | 0 | 3 | Unlimited | Unlimited |
| Remove "Powered by" | No | Yes | Yes | Yes |

Connector usage counts toward your plan's token limits.

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
