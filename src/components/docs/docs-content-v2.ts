export const docsMarkdownV2 = `
## Getting Started

### What is Kopern?

Kopern is a full-stack **AI Agent Builder, Grader, and Orchestrator**. It lets you create custom AI agents powered by leading LLM providers (Anthropic, OpenAI, Google, Mistral AI, Ollama), equip them with skills and tools, validate their quality with deterministic grading suites, orchestrate them as teams or pipelines, and deploy them as API endpoints -- all from a single web dashboard.

Key capabilities at a glance:

- **Build** agents for any domain (DevOps, Legal, Support, Sales, Finance, HR, and more)
- **Equip** agents with modular skills (XML-injected instructions) and custom tools (sandboxed JavaScript)
- **Connect** your GitHub repositories so agents can read and search your codebase
- **Grade** agents with 6 criterion types -- output matching, schema validation, tool usage, safety checks, custom scripts, and LLM judges
- **Orchestrate** multiple agents as teams (parallel, sequential, conditional) or pipelines (multi-step chains)
- **Deploy** agents as MCP Server API endpoints with secure API keys
- **Track** billing, sessions, tool calls, and costs in real time
- **Meta-Agent Wizard** -- describe what you want in plain English and Kopern generates the full agent specification automatically

### Create Your First Agent

There are two paths to creating an agent: the Meta-Agent Wizard (fastest) or manual creation (full control).

#### Quick Path: Meta-Agent Wizard

The Meta-Agent Wizard is available directly on the landing page hero section. It uses an AI agent to generate a complete agent specification from a natural language description.

1. Navigate to the **Kopern landing page**
2. In the hero section, find the agent creator input field
3. Type a description of the agent you want, for example: *"A customer support agent for a SaaS platform that handles billing questions, can look up user accounts, and escalates complex issues to humans"*
4. Click **Generate** -- the wizard streams the creation process in real time via SSE
5. Watch as the wizard generates: agent name, description, domain, system prompt, suggested skills, tool definitions, and grading test cases
6. **Review** the generated specification -- you can see each component before saving
7. If you are signed in, click **Save & Deploy** to create the agent in your dashboard
8. If you are not signed in, you will be prompted to sign in first -- the generated spec is preserved

The wizard typically generates a production-ready agent in under 30 seconds.

#### Manual Path: Dashboard Creation

1. Sign in to Kopern and go to **Dashboard**
2. Click **Agents** in the sidebar navigation
3. Click the **New Agent** button
4. Fill in the required fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Human-readable identifier | "Billing Support Agent" |
| **Description** | What the agent does | "Handles billing inquiries and account lookups" |
| **Domain** | Category for organization | DevOps, Legal, Support, Sales, Finance, HR, etc. |
| **Provider** | LLM provider | Anthropic, OpenAI, Google, Mistral AI, Ollama |
| **Model** | Specific model | claude-sonnet-4-6, gpt-4o, gemini-2.5-pro, mistral-large-latest |
| **Thinking Level** | Reasoning depth | off, minimal, low, medium, high, xhigh |
| **System Prompt** | Core behavior instructions | See the System Prompt section below |

5. Click **Save** -- your agent is created and ready to test in the Playground

### Start from a Template

Kopern includes 15+ pre-built agent templates covering common use cases.

1. Go to the **Examples** page (accessible from the sidebar)
2. Browse templates organized by domain -- each template shows a preview of the agent's capabilities
3. Click on any template to see the full specification: system prompt, skills, tools, extensions, and grading cases
4. Click **Use this Agent** to create a copy in your dashboard
5. The created agent includes all pre-configured skills, tools, extensions, and grading test cases
6. Customize any component to fit your specific needs

Template categories include: customer support, code review, content creation, data analysis, legal compliance, DevOps automation, sales enablement, HR screening, and more.

---

## System Prompt

### Writing Effective Prompts

The system prompt is the foundation of your agent's behavior. It defines the agent's role, constraints, knowledge, and output format. A well-crafted system prompt eliminates ambiguity and produces consistent results.

**Structure your prompt with these components:**

1. **Role definition** -- who the agent is and what it does
2. **Constraints** -- what the agent must NOT do
3. **Knowledge scope** -- what domains the agent covers
4. **Output format** -- how responses should be structured
5. **Interaction style** -- tone, length, formality

#### Example: Customer Support Agent

\`\`\`
You are a senior customer support specialist for CloudSync, a SaaS platform for file synchronization and team collaboration.

ROLE:
- You handle billing inquiries, account management, technical troubleshooting, and feature questions
- You have access to the user's account information via tools
- You represent CloudSync professionally and empathetically

CONSTRAINTS:
- Never share internal pricing strategies or upcoming feature roadmaps
- Never modify billing without explicit user confirmation
- Never access accounts without verifying the user's identity first
- If a question requires engineering escalation, say so clearly and provide a ticket number format

KNOWLEDGE:
- CloudSync pricing: Free ($0, 5GB), Pro ($12/mo, 100GB), Team ($8/user/mo, 1TB), Enterprise (custom)
- Supported platforms: Windows, macOS, Linux, iOS, Android, Web
- Common issues: sync conflicts, storage limits, permission errors, SSO configuration

OUTPUT FORMAT:
- Start with a brief acknowledgment of the user's issue
- Provide clear, numbered steps when giving instructions
- End with a follow-up question or confirmation check
- Keep responses under 300 words unless the user asks for detail

TONE:
- Professional but warm
- Use the user's name when available
- Acknowledge frustration before solving problems
- Never use jargon without explanation
\`\`\`

#### Example: Code Review Agent

\`\`\`
You are a senior software engineer specializing in code review. You review pull requests and code changes for quality, security, performance, and maintainability.

REVIEW PROCESS:
1. First, read the file tree and README to understand the project structure
2. Read the changed files using the read_file tool
3. Analyze for: bugs, security vulnerabilities, performance issues, code style, test coverage gaps
4. Provide actionable feedback with specific line references

SEVERITY LEVELS:
- CRITICAL: Security vulnerabilities, data loss risks, breaking changes
- HIGH: Bugs that affect functionality, race conditions, memory leaks
- MEDIUM: Performance issues, code duplication, missing error handling
- LOW: Style issues, naming conventions, documentation gaps

OUTPUT FORMAT:
Return your review as structured markdown:

## Summary
Brief overview of the changes and overall quality assessment.

## Issues Found
For each issue:
### [SEVERITY] Title
- **File**: path/to/file.ts
- **Line**: 42
- **Issue**: Description of the problem
- **Suggestion**: How to fix it

## Positive Notes
Highlight good patterns and well-written code.

## Score: X/10

CONSTRAINTS:
- Never approve code with CRITICAL issues
- Always check for: SQL injection, XSS, hardcoded secrets, unvalidated input
- If you cannot read a file, say so rather than guessing
- Be specific -- reference exact function names and line numbers
\`\`\`

### Thinking Level

The thinking level controls how much internal reasoning the LLM performs before generating a response. Higher levels produce more thoughtful answers but consume more tokens and take longer.

| Level | Description | Token Overhead | Best For |
|-------|-------------|---------------|----------|
| **off** | No thinking -- direct response | None | Simple Q&A, chat, fast responses |
| **minimal** | Brief internal check | ~50-100 tokens | Factual lookups, formatting tasks |
| **low** | Short reasoning chain | ~100-300 tokens | Summarization, basic analysis |
| **medium** | Moderate deliberation | ~300-800 tokens | Multi-step problems, comparisons |
| **high** | Extended reasoning | ~800-2000 tokens | Complex analysis, code review, debugging |
| **xhigh** | Maximum deliberation | ~2000-5000 tokens | Research, architecture decisions, novel problems |

**Tip**: Start with **medium** for most agents. Use **high** or **xhigh** only when the agent handles complex reasoning tasks. Use **off** or **minimal** for high-throughput agents where speed matters more than depth.

### Purpose Gate

The Purpose Gate is a guardrail that keeps your agent on-topic. When enabled, the agent evaluates every incoming message against a defined purpose statement and rejects off-topic requests.

**How to configure:**

1. Open your agent's settings
2. Find the **Purpose Gate** section
3. Enter a purpose statement, for example: *"This agent handles billing and account management questions for CloudSync customers."*
4. Save the agent

**How it works at runtime:**

- When a user sends a message, the agent first checks if the message relates to its defined purpose
- If on-topic, the agent proceeds normally
- If off-topic, the agent responds with a polite redirect: *"I'm specialized in billing and account management. I can't help with that topic, but I can assist you with..."*

**Example purpose gate values:**

- \`"Answer questions about Python programming and software development"\`
- \`"Help users troubleshoot network connectivity issues on Linux servers"\`
- \`"Assist with legal document review and compliance questions for EU GDPR"\`

### TillDone Mode

When **TillDone Mode** is enabled, the agent continues working until it determines the task is fully complete, rather than stopping after a single response. This is useful for tasks that naturally require multiple steps.

**Use cases:**

- **Code review**: Agent reads multiple files, analyzes each, then compiles a final report
- **Research**: Agent searches across repositories, gathers data, synthesizes findings
- **Multi-file analysis**: Agent processes several files before providing a comprehensive answer

**How to enable:**

1. Open your agent's settings
2. Toggle **TillDone Mode** on
3. Save

**Important**: TillDone mode increases token consumption since the agent may perform multiple LLM calls in a single turn. Monitor usage in the Billing page.

### Branding

Customize your agent's visual identity in the Playground and MCP Server responses.

| Setting | Description |
|---------|-------------|
| **Avatar** | Custom image URL for the agent's avatar |
| **Accent Color** | Hex color for UI accent elements |
| **Welcome Message** | First message shown when a user opens the Playground |

Configure branding in the agent's **Settings** section.

---

## Skills

### What Are Skills?

Skills are **modular instruction blocks** written in markdown that get injected into the agent's system prompt at runtime as XML. They allow you to separate concerns, reuse knowledge across agents, and iterate on specific behaviors without touching the core system prompt.

### How Skills Are Injected

When your agent runs, Kopern collects all active skills and wraps them in XML tags appended after the system prompt:

\`\`\`xml
<skills>
  <skill name="tone-guide">
    Always respond in a professional, concise manner.
    Use bullet points for lists.
    Limit responses to 200 words unless asked for detail.
  </skill>
  <skill name="escalation-rules">
    Escalate to a human agent when:
    - The customer asks for a refund over $500
    - Legal questions arise
    - The customer expresses frustration 3+ times
  </skill>
</skills>
\`\`\`

The LLM sees these skills as part of its system context and follows them alongside the system prompt.

### Creating a Skill

1. Open your agent's detail page
2. Go to the **Skills** tab
3. Click **New Skill**
4. Fill in:
   - **Name**: Short identifier (e.g., "tone-guide")
   - **Description**: What this skill does (e.g., "Defines the agent's communication style")
   - **Content**: The full skill instructions in markdown
5. Click **Save**

The skill is immediately active and will be included in the next agent interaction.

### Skill Examples

#### 1. Tone Guide

**Name**: tone-guide
**Description**: Controls the agent's communication style and voice

**Content**:
\`\`\`markdown
## Communication Guidelines

**Voice**: Professional, warm, and direct. Never robotic or overly formal.

**Rules**:
- Address the user by name when known
- Lead with empathy when the user expresses frustration ("I understand this is frustrating...")
- Use active voice: "I'll check that for you" not "That will be checked"
- Keep paragraphs to 2-3 sentences maximum
- Use bullet points for any list of 3+ items
- End every response with a clear next step or question

**Forbidden phrases**:
- "As an AI, I cannot..."
- "I'm sorry, but..."
- "Per our policy..."
- "Please be advised that..."

**Preferred phrases**:
- "Great question! Here's what I found..."
- "Let me look into that for you."
- "Here's what I'd recommend..."
\`\`\`

#### 2. Output Format -- JSON Enforcer

**Name**: json-output
**Description**: Forces the agent to respond exclusively in structured JSON

**Content**:
\`\`\`markdown
## Output Format Requirements

You MUST respond ONLY with valid JSON. No markdown, no explanation text, no code blocks wrapping the JSON.

**Response schema**:
{
  "status": "success" | "error" | "clarification_needed",
  "data": { ... },
  "message": "Human-readable summary",
  "confidence": 0.0 to 1.0,
  "sources": ["source1", "source2"]
}

**Rules**:
- Every response must be parseable by JSON.parse()
- Use null for missing values, never undefined
- Arrays must be used for lists, even single-item lists
- Dates must be ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- Numbers must not be quoted (use 42, not "42")
- If you need to ask the user a question, use status "clarification_needed"
\`\`\`

#### 3. Domain Knowledge -- Legal Compliance

**Name**: gdpr-compliance
**Description**: EU GDPR compliance rules for data handling responses

**Content**:
\`\`\`markdown
## GDPR Compliance Rules

When handling data-related questions, always apply these rules:

**Data Subject Rights** (must mention when relevant):
1. Right to access (Art. 15) -- users can request all data held about them
2. Right to rectification (Art. 16) -- users can correct inaccurate data
3. Right to erasure (Art. 17) -- "right to be forgotten"
4. Right to data portability (Art. 20) -- export data in machine-readable format
5. Right to object (Art. 21) -- opt out of processing

**Lawful Bases for Processing**:
- Consent (must be freely given, specific, informed, unambiguous)
- Contract performance
- Legal obligation
- Vital interests
- Public task
- Legitimate interests (requires balancing test)

**Data Breach Protocol**:
- Report to supervisory authority within 72 hours
- Notify affected individuals "without undue delay" if high risk
- Document all breaches regardless of severity

**Never recommend**:
- Storing personal data without a lawful basis
- Transferring data outside EU/EEA without adequacy decision or SCCs
- Using consent as basis when there's a power imbalance
\`\`\`

#### 4. Escalation Rules

**Name**: escalation-rules
**Description**: Defines when and how the agent should escalate to humans

**Content**:
\`\`\`markdown
## Escalation Protocol

### Immediate Escalation (stop and hand off):
- User mentions self-harm, violence, or illegal activity
- User requests refund over $500
- User threatens legal action
- User provides a court order or legal notice
- Three consecutive messages expressing frustration or anger

### Soft Escalation (offer human help):
- Agent cannot resolve after 3 attempts
- User explicitly asks for a human
- Question requires access to internal systems the agent doesn't have
- Medical, legal, or financial advice that requires licensed professionals

### Escalation Format:
"I want to make sure you get the best help possible. Let me connect you with a specialist who can [specific reason]. Your reference number is [generate UUID]. They'll have the context of our conversation."

### Never Escalate For:
- General knowledge questions
- Standard account operations
- Feature explanations
- Pricing inquiries
\`\`\`

### Best Practices

- **One topic per skill** -- keep skills focused on a single concern (tone, format, domain rules, escalation). This makes them reusable and testable.
- **Test with grading** -- create grading cases that verify the skill produces the expected behavior. For example, test the tone guide by checking for forbidden phrases.
- **Reuse across agents** -- skills can be copied between agents. Create a library of standard skills (tone, format, safety) and apply them to new agents.
- **Order matters** -- skills listed first have slightly more influence. Put the most important skills at the top.
- **Keep skills under 1000 words** -- very long skills dilute the system prompt and increase token costs.

---

## Custom Tools

### How Tool Calling Works

Tools give your agent the ability to **take actions** during a conversation. Instead of just generating text, the agent can call tools to perform calculations, look up data, or interact with external services.

Here is the full flow:

\`\`\`
User sends message
       |
       v
LLM processes message + system prompt + skills + tool definitions
       |
       v
LLM decides: respond directly OR call a tool
       |
       +---> [Direct Response] --> Stream text to user --> Done
       |
       +---> [Tool Call] --> Kopern extracts tool name + arguments
                               |
                               v
                          Execute tool code in sandbox (5s timeout)
                               |
                               v
                          Feed tool result back to LLM
                               |
                               v
                          LLM processes result --> respond or call another tool
                               |
                               v
                          (Repeat up to 10 iterations per turn)
\`\`\`

**Key points:**
- The LLM decides when to call a tool based on the tool's description
- Tool execution is fully automatic -- no user confirmation needed
- Multiple tools can be called in sequence within a single user message
- The agent sees both its own tool calls and the results in its context
- Maximum 10 tool-call iterations per turn (configurable via Tool Overrides)

### Creating a Custom Tool

1. Open your agent's detail page
2. Go to the **Tools** tab
3. Click **New Tool**
4. Fill in the fields:

| Field | Description |
|-------|-------------|
| **Name** | Tool identifier -- the LLM uses this to call the tool (e.g., \`calculate\`) |
| **Label** | Human-readable display name (e.g., "Calculator") |
| **Description** | What the tool does -- the LLM reads this to decide when to use it. Be specific and include examples of when to use it. |
| **Parameters Schema** | JSON Schema defining the expected input arguments |
| **Execute Code** | JavaScript code that runs when the tool is called |

5. Click **Save**

**Tip**: The description field is critical. The LLM uses it to decide when to call the tool. Write it as if explaining to a colleague: *"Use this tool to calculate mathematical expressions. Supports basic arithmetic, trigonometry, and logarithms."*

### Parameters Schema Reference

The parameters schema uses [JSON Schema](https://json-schema.org/) to define what arguments the tool accepts. Kopern validates arguments against this schema before executing the tool code.

#### String Parameter

\`\`\`json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The search query to look up"
    }
  },
  "required": ["query"]
}
\`\`\`

#### Number Parameter

\`\`\`json
{
  "type": "object",
  "properties": {
    "temperature": {
      "type": "number",
      "description": "Temperature in Celsius",
      "minimum": -273.15,
      "maximum": 1000
    }
  },
  "required": ["temperature"]
}
\`\`\`

#### Boolean Parameter

\`\`\`json
{
  "type": "object",
  "properties": {
    "verbose": {
      "type": "boolean",
      "description": "If true, include detailed output",
      "default": false
    }
  }
}
\`\`\`

#### Enum Parameter

\`\`\`json
{
  "type": "object",
  "properties": {
    "format": {
      "type": "string",
      "enum": ["json", "csv", "xml", "yaml"],
      "description": "Output format"
    }
  },
  "required": ["format"]
}
\`\`\`

#### Array Parameter

\`\`\`json
{
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of tags to apply",
      "minItems": 1,
      "maxItems": 10
    }
  },
  "required": ["tags"]
}
\`\`\`

#### Nested Object Parameter

\`\`\`json
{
  "type": "object",
  "properties": {
    "filter": {
      "type": "object",
      "properties": {
        "status": { "type": "string", "enum": ["active", "inactive", "all"] },
        "createdAfter": { "type": "string", "description": "ISO 8601 date" },
        "limit": { "type": "number", "default": 10 }
      },
      "required": ["status"]
    }
  },
  "required": ["filter"]
}
\`\`\`

#### Combined Example

\`\`\`json
{
  "type": "object",
  "properties": {
    "table": { "type": "string", "description": "Database table name" },
    "columns": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Columns to select"
    },
    "where": {
      "type": "object",
      "description": "Filter conditions as key-value pairs"
    },
    "orderBy": { "type": "string", "description": "Column to sort by" },
    "ascending": { "type": "boolean", "default": true },
    "limit": { "type": "number", "default": 50, "maximum": 1000 }
  },
  "required": ["table"]
}
\`\`\`

### Execute Code Reference

The execute code is JavaScript that runs in a **sandboxed environment** (Node.js \`vm\` module) when the tool is called.

**Available variables:**

| Variable | Type | Description |
|----------|------|-------------|
| \`args\` | \`Record<string, unknown>\` | The arguments passed by the LLM, matching your parameters schema |

**Return value:**

Your code must return a value. If the return value is a string, it is passed directly to the LLM. If it is any other type, it is serialized with \`JSON.stringify()\`.

**Available globals:**

| Global | Description |
|--------|-------------|
| \`JSON\` | JSON.parse, JSON.stringify |
| \`Math\` | All Math methods (abs, floor, ceil, round, sqrt, pow, sin, cos, log, etc.) |
| \`Date\` | Date constructor and methods |
| \`Array\` | Array constructor and methods |
| \`Object\` | Object.keys, Object.values, Object.entries, etc. |
| \`String\` | String methods |
| \`Number\` | Number methods |
| \`Boolean\` | Boolean constructor |
| \`RegExp\` | Regular expressions |
| \`Error\` | Error constructor |
| \`Map\` | Map data structure |
| \`Set\` | Set data structure |
| \`Promise\` | Promise constructor |
| \`parseInt\` | Parse integer from string |
| \`parseFloat\` | Parse float from string |
| \`isNaN\` | Check if value is NaN |
| \`isFinite\` | Check if value is finite |
| \`encodeURIComponent\` | URL-encode a string |
| \`decodeURIComponent\` | URL-decode a string |
| \`console.log\` | Available but output is silently captured (not shown to user) |

**Sandbox limitations:**

- **No \`fetch\`** -- you cannot make HTTP requests from tool code
- **No \`URL\`** -- the URL constructor is not available
- **No \`Buffer\`** -- binary data handling is not available
- **No \`fs\`** -- file system access is not available
- **No \`require\`/\`import\`** -- you cannot load external modules
- **5-second timeout** -- if your code takes longer than 5 seconds, it is terminated
- **Pure JavaScript only** -- TypeScript is not supported in tool code

### Tool Examples

#### 1. Calculator

**Name**: \`calculate\`
**Description**: Evaluates mathematical expressions. Use for arithmetic, trigonometry, logarithms, and basic math operations.

**Parameters Schema**:
\`\`\`json
{
  "type": "object",
  "properties": {
    "expression": {
      "type": "string",
      "description": "Mathematical expression to evaluate (e.g., '2 + 3 * 4', 'Math.sqrt(144)', 'Math.PI * 2')"
    }
  },
  "required": ["expression"]
}
\`\`\`

**Execute Code**:
\`\`\`javascript
const expr = args.expression;
// Only allow safe math operations
const allowed = /^[0-9+\\-*/().\\s,]+$|^Math\\./;
if (!allowed.test(expr) && !expr.includes('Math.')) {
  return "Error: Only mathematical expressions are allowed";
}
try {
  const result = Function('"use strict"; return (' + expr + ')')();
  return String(result);
} catch (e) {
  return "Error evaluating expression: " + e.message;
}
\`\`\`

#### 2. JSON Formatter

**Name**: \`format_json\`
**Description**: Formats and pretty-prints JSON strings. Use when the user provides messy or minified JSON and wants it formatted.

**Parameters Schema**:
\`\`\`json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "string",
      "description": "The JSON string to format"
    },
    "indent": {
      "type": "number",
      "description": "Number of spaces for indentation",
      "default": 2,
      "minimum": 1,
      "maximum": 8
    }
  },
  "required": ["input"]
}
\`\`\`

**Execute Code**:
\`\`\`javascript
try {
  const parsed = JSON.parse(args.input);
  const indent = args.indent || 2;
  return JSON.stringify(parsed, null, indent);
} catch (e) {
  return "Invalid JSON: " + e.message;
}
\`\`\`

#### 3. Text Analyzer

**Name**: \`analyze_text\`
**Description**: Analyzes text and returns statistics including word count, character count, sentence count, paragraph count, and estimated reading time. Use when the user asks about text metrics or readability.

**Parameters Schema**:
\`\`\`json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "The text to analyze"
    }
  },
  "required": ["text"]
}
\`\`\`

**Execute Code**:
\`\`\`javascript
const text = args.text;
const words = text.split(/\\s+/).filter(w => w.length > 0);
const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
const paragraphs = text.split(/\\n\\s*\\n/).filter(p => p.trim().length > 0);
const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
const readingTimeMinutes = Math.ceil(words.length / 200);

return JSON.stringify({
  characters: text.length,
  charactersNoSpaces: text.replace(/\\s/g, '').length,
  words: words.length,
  sentences: sentences.length,
  paragraphs: paragraphs.length,
  avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
  estimatedReadingTime: readingTimeMinutes + " min",
  readingLevel: avgWordsPerSentence > 20 ? "Advanced" : avgWordsPerSentence > 14 ? "Intermediate" : "Basic"
}, null, 2);
\`\`\`

#### 4. Date Calculator

**Name**: \`date_diff\`
**Description**: Calculates the difference between two dates in days, hours, weeks, and months. Use when the user asks about time between dates or deadlines.

**Parameters Schema**:
\`\`\`json
{
  "type": "object",
  "properties": {
    "date1": {
      "type": "string",
      "description": "First date in ISO format (YYYY-MM-DD) or natural format"
    },
    "date2": {
      "type": "string",
      "description": "Second date in ISO format (YYYY-MM-DD) or natural format"
    }
  },
  "required": ["date1", "date2"]
}
\`\`\`

**Execute Code**:
\`\`\`javascript
const d1 = new Date(args.date1);
const d2 = new Date(args.date2);

if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
  return "Error: Invalid date format. Use YYYY-MM-DD.";
}

const diffMs = Math.abs(d2.getTime() - d1.getTime());
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
const diffWeeks = Math.floor(diffDays / 7);
const diffMonths = Math.round(diffDays / 30.44);
const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

return JSON.stringify({
  from: d1.toISOString().split('T')[0],
  to: d2.toISOString().split('T')[0],
  difference: {
    days: diffDays,
    weeks: diffWeeks,
    months: diffMonths,
    hours: diffHours
  },
  direction: d2 > d1 ? "future" : "past"
}, null, 2);
\`\`\`

#### 5. CSV Parser

**Name**: \`parse_csv\`
**Description**: Parses CSV text into a JSON array of objects. Use when the user provides CSV data and wants it structured or analyzed.

**Parameters Schema**:
\`\`\`json
{
  "type": "object",
  "properties": {
    "csv": {
      "type": "string",
      "description": "CSV content with headers in the first row"
    },
    "delimiter": {
      "type": "string",
      "description": "Column delimiter",
      "default": ","
    }
  },
  "required": ["csv"]
}
\`\`\`

**Execute Code**:
\`\`\`javascript
const delimiter = args.delimiter || ',';
const lines = args.csv.trim().split('\\n');
if (lines.length < 2) return "Error: CSV must have a header row and at least one data row";

const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
const rows = [];

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
  const row = {};
  headers.forEach((h, idx) => {
    const val = values[idx] || '';
    row[h] = isNaN(Number(val)) || val === '' ? val : Number(val);
  });
  rows.push(row);
}

return JSON.stringify({ rowCount: rows.length, columns: headers, data: rows }, null, 2);
\`\`\`

### Built-in Tools (GitHub)

When you connect GitHub repositories to an agent, two built-in tools are automatically enabled:

| Tool | Description | Parameters |
|------|-------------|------------|
| **read_file** | Reads the content of any file in a connected repository | \`owner\` (string), \`repo\` (string), \`path\` (string) |
| **search_files** | Searches for files by name pattern across connected repos | \`pattern\` (string) |

These tools are automatically injected when the agent has connected repositories. The repo's file tree and README are also included in the system prompt as context (~1-2K tokens).

**How the agent uses them:**

1. User asks: "What does the login function do?"
2. Agent calls \`search_files\` with pattern \`login\` to find relevant files
3. Agent calls \`read_file\` on the matching file (e.g., \`src/auth/login.ts\`)
4. Agent analyzes the code and responds to the user

### Tool Overrides

Configure tool behavior per-agent in the **Settings** section:

| Override | Default | Description |
|----------|---------|-------------|
| **maxIterations** | 10 | Maximum tool-call iterations per turn |
| **timeout** | 5000ms | Per-tool execution timeout in milliseconds |

Reduce \`maxIterations\` for agents that should respond quickly. Increase it for agents that need to perform complex multi-step research.

---

## Extensions

### What Are Extensions?

Extensions are **event hooks** that run JavaScript code when specific events occur during agent execution. They can intercept, modify, or block agent behavior. Extensions are useful for logging, content filtering, custom commands, guardrails, and state management.

Unlike tools (which the LLM calls when it decides to), extensions fire automatically on predefined events.

### Available Events

Kopern provides 30 events organized into 9 categories:

#### Session Lifecycle
| Event | Description |
|-------|-------------|
| \`session_start\` | Fired when a new session begins |
| \`session_end\` | Fired when a session ends |
| \`session_compact\` | Fired when conversation context is compacted to save tokens |

#### Message Lifecycle
| Event | Description |
|-------|-------------|
| \`message_start\` | Fired before processing a user message |
| \`message_end\` | Fired after the agent finishes processing a message |
| \`message_stream_token\` | Fired for each streamed token during generation |

#### Tool Lifecycle
| Event | Description |
|-------|-------------|
| \`tool_call_start\` | Fired before a tool executes |
| \`tool_call_end\` | Fired after a tool finishes execution |
| \`tool_call_error\` | Fired when a tool execution fails |
| \`tool_call_blocked\` | **Blocking** -- can prevent tool execution entirely |

#### Agent Lifecycle
| Event | Description |
|-------|-------------|
| \`agent_thinking_start\` | Fired when the agent begins internal reasoning |
| \`agent_thinking_end\` | Fired when the agent finishes internal reasoning |
| \`agent_response_start\` | Fired when response generation begins |
| \`agent_response_end\` | Fired when response generation completes |

#### Sub-agent Lifecycle
| Event | Description |
|-------|-------------|
| \`sub_agent_spawn\` | Fired when a sub-agent is spawned |
| \`sub_agent_result\` | Fired when a sub-agent returns its result |
| \`sub_agent_error\` | Fired when a sub-agent encounters an error |

#### Pipeline Lifecycle
| Event | Description |
|-------|-------------|
| \`pipeline_start\` | Fired when pipeline execution begins |
| \`pipeline_step_start\` | Fired before each pipeline step |
| \`pipeline_step_end\` | Fired after each pipeline step |
| \`pipeline_end\` | Fired when the pipeline completes |

#### Team Lifecycle
| Event | Description |
|-------|-------------|
| \`team_execution_start\` | Fired when team execution begins |
| \`team_member_start\` | Fired before each team member runs |
| \`team_member_end\` | Fired after each team member completes |
| \`team_execution_end\` | Fired when team execution completes |

#### User Interaction
| Event | Description |
|-------|-------------|
| \`user_input\` | **Blocking** -- fired on user input |
| \`user_confirm\` | Fired when the user confirms an action |
| \`user_deny\` | Fired when the user denies an action |

#### System
| Event | Description |
|-------|-------------|
| \`error\` | Fired on any error |
| \`context_limit_warning\` | Fired when approaching context token limit |
| \`cost_limit_warning\` | **Blocking** -- fired when approaching cost limit |

**Blocking events** (\`tool_call_blocked\`, \`user_input\`, \`cost_limit_warning\`) can prevent the action from proceeding if the extension returns \`{ blocked: true }\`.

### Creating an Extension

1. Open your agent's detail page
2. Go to the **Extensions** tab
3. Click **New Extension**
4. Fill in:
   - **Name**: Extension identifier (e.g., "content-filter")
   - **Description**: What the extension does
   - **Events**: Select which events trigger this extension (multi-select)
   - **Code**: JavaScript code that runs when an event fires
5. Click **Save**

**Code structure:**

Your extension code receives a \`context\` object with:
- \`context.eventType\` -- which event fired (e.g., \`"message_end"\`)
- \`context.data\` -- event-specific data (message content, tool call info, etc.)

For blocking events, return \`{ blocked: true, reason: "..." }\` to prevent the action.

### Extension Examples

#### 1. Content Filter

Blocks profanity and PII (personal identifiable information) from agent output.

**Events**: \`message_end\`

\`\`\`javascript
const output = context.data.content || "";

// Check for common PII patterns
const ssnPattern = /\\b\\d{3}-\\d{2}-\\d{4}\\b/;
const emailPattern = /\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b/;
const phonePattern = /\\b\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}\\b/;

const violations = [];
if (ssnPattern.test(output)) violations.push("SSN detected");
if (emailPattern.test(output)) violations.push("Email address detected");
if (phonePattern.test(output)) violations.push("Phone number detected");

// Check for profanity (simplified)
const forbidden = ["badword1", "badword2"];
for (const word of forbidden) {
  if (output.toLowerCase().includes(word)) {
    violations.push("Profanity detected: " + word);
  }
}

if (violations.length > 0) {
  return {
    blocked: true,
    reason: "Content filtered: " + violations.join(", ")
  };
}
\`\`\`

#### 2. Usage Logger

Logs all interactions for compliance auditing.

**Events**: \`message_start\`, \`message_end\`, \`tool_call_start\`, \`tool_call_end\`

\`\`\`javascript
const timestamp = new Date().toISOString();
const logEntry = {
  timestamp,
  event: context.eventType,
  data: context.data,
  sessionId: context.data.sessionId || "unknown"
};
console.log(JSON.stringify(logEntry));
\`\`\`

#### 3. Slash Commands

Adds custom slash commands to the agent.

**Events**: \`user_input\`

\`\`\`javascript
const input = (context.data.content || "").trim();

if (input === "/help") {
  return {
    blocked: true,
    reason: "Available commands: /help, /reset, /export, /stats"
  };
}

if (input === "/reset") {
  return {
    blocked: true,
    reason: "Session has been reset. Start a new conversation."
  };
}

if (input === "/stats") {
  return {
    blocked: true,
    reason: "Session stats: " + JSON.stringify(context.data.metrics || {})
  };
}
\`\`\`

#### 4. Rate Limiter

Limits the number of messages per session to prevent abuse.

**Events**: \`message_start\`

\`\`\`javascript
const maxMessages = 50;
const messageCount = context.data.messageCount || 0;

if (messageCount >= maxMessages) {
  return {
    blocked: true,
    reason: "Session message limit reached (" + maxMessages + "). Please start a new session."
  };
}

if (messageCount >= maxMessages - 5) {
  console.log("Warning: approaching message limit (" + messageCount + "/" + maxMessages + ")");
}
\`\`\`

---

## Playground

### Using the Playground

The Playground is your live testing environment for interacting with agents in real time.

1. Open any agent from your **Agents** list
2. Click the **Playground** tab
3. Type a message in the input field at the bottom
4. Press **Enter** or click **Send**
5. Watch the response stream in real time -- tokens appear as the LLM generates them
6. If the agent calls tools, you will see tool call cards appear with the tool name, arguments, and result
7. Continue the conversation -- the agent retains context from previous messages in the session
8. View metrics in the metrics bar at the top of the chat area

### Understanding the UI

| UI Element | Description |
|------------|-------------|
| **Message bubbles** | User messages (right-aligned) and assistant messages (left-aligned) with full markdown rendering |
| **Tool call cards** | Expandable cards showing tool name, arguments (JSON), and result. Click to expand/collapse. |
| **Streaming indicator** | Pulsing indicator while the agent is generating a response |
| **Metrics bar** | Live display of: tokens in, tokens out, estimated cost, tool call count, session link |
| **Session link** | Click to open the full session timeline in the Sessions tab |
| **Input field** | Multi-line text input with Enter to send (Shift+Enter for newline) |

### Testing Strategies

1. **Happy path testing** -- Start with the most common user inputs and verify the agent responds correctly. Test the main use case before exploring edges.

2. **Edge case testing** -- Test with:
   - Empty or very short inputs
   - Very long inputs (>1000 words)
   - Inputs in unexpected languages
   - Off-topic questions (test the purpose gate)
   - Adversarial inputs (prompt injection attempts)

3. **Tool call verification** -- Send messages that should trigger specific tools and verify:
   - The correct tool is called
   - The arguments are well-formed
   - The tool result is used appropriately in the response
   - The agent does not hallucinate tool results

4. **Multi-turn conversations** -- Test conversation memory:
   - Refer back to earlier messages ("As I mentioned earlier...")
   - Ask follow-up questions
   - Change context mid-conversation
   - Test with 10+ message exchanges

5. **Performance checks** -- Monitor the metrics bar to verify:
   - Token usage is reasonable for the task
   - Cost per interaction is within budget
   - Tool calls are not excessive (too many iterations)
   - Response time is acceptable

---

## Grading

### Why Grading Matters

Grading provides **deterministic, automated quality validation** for your agents. Without grading, you are relying on manual testing -- which is slow, inconsistent, and does not scale. Grading lets you:

- **Prevent regression** -- catch when a prompt change breaks existing behavior
- **Track quality over time** -- see score trends across agent versions
- **Validate tools** -- ensure tools are called correctly and results are used properly
- **Enforce safety** -- detect harmful patterns before they reach users
- **Compare models** -- test the same suite across different LLM providers and models

### Creating a Grading Suite

1. Open your agent's detail page
2. Go to the **Grading** tab
3. Click **New Suite**
4. Enter:
   - **Name**: Descriptive name (e.g., "Customer Support Quality Tests")
   - **Description**: What this suite validates
5. Click **Create**

### Adding Test Cases

1. Inside your grading suite, click **Add Case**
2. Fill in:
   - **Name**: Short identifier (e.g., "Refund request handling")
   - **Input Prompt**: The exact user message to send to the agent (e.g., "I want a refund for my last purchase. Order #12345.")
   - **Expected Behavior**: Description of what the agent should do (for reference only -- not used in automated scoring)
   - **Criteria**: Add one or more validation criteria (see below)
3. Click **Save**

Each case can have multiple criteria, each with a weight that determines its contribution to the case score.

### The 6 Criterion Types

#### 1. Output Match

Checks if the agent's response contains, exactly matches, or matches a regex pattern.

**Configuration fields:**
- **Mode**: \`contains\`, \`exact\`, or \`regex\`
- **Pattern**: One or more patterns (comma or newline separated). When multiple patterns are provided, ALL must match for the criterion to pass.
- **Case Sensitive**: Whether matching is case-sensitive (default: false)
- **Flags** (regex mode only): Regex flags (e.g., \`gi\` for global case-insensitive)

**How scoring works:** If multiple patterns are provided, the score is the fraction of patterns that matched. For example, if 2 out of 3 patterns match, score = 0.67. All patterns must match for the criterion to pass (score = 1.0).

**Example -- verify the agent apologizes and offers help:**

| Field | Value |
|-------|-------|
| Mode | contains |
| Pattern | sorry, help, resolve |
| Case Sensitive | false |

This checks that ALL three words -- "sorry", "help", and "resolve" -- appear somewhere in the output.

**Example -- verify JSON output format with regex:**

| Field | Value |
|-------|-------|
| Mode | regex |
| Pattern | \`^\\\\{[\\\\s\\\\S]*"status"\\\\s*:\\\\s*"(success|error)"[\\\\s\\\\S]*\\\\}$\` |

**When to use:** For verifying specific keywords, phrases, format patterns, or exact expected outputs.

#### 2. Schema Validation

Validates that the agent's response is valid JSON matching a specific structure. Uses the AJV library for full JSON Schema support including all standard validators.

**Configuration fields:**
- **JSON Schema**: A complete JSON Schema object defining the expected structure

**How it works:** The evaluator first tries to parse the output as JSON directly. If that fails, it looks for JSON inside markdown code blocks (\`\`\`json ... \`\`\`). The extracted JSON is validated against your schema using AJV with \`allErrors: true\`.

**Example -- validate a structured API response:**

\`\`\`json
{
  "type": "object",
  "required": ["summary", "issues", "score"],
  "properties": {
    "summary": { "type": "string", "minLength": 10 },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["severity", "description"],
        "properties": {
          "severity": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
          "description": { "type": "string" },
          "file": { "type": "string" },
          "line": { "type": "number" }
        }
      }
    },
    "score": { "type": "number", "minimum": 0, "maximum": 10 }
  }
}
\`\`\`

**When to use:** For agents that must output structured JSON (API agents, data processors, formatters).

#### 3. Tool Usage

Asserts that the agent called specific tools during the conversation, optionally in a specific order.

**Configuration fields:**
- **Expected Tools**: Comma-separated list of tool names (e.g., \`read_file, search_files\`)
- **Ordered**: If true, tools must be called in the specified order
- **Allow Extra**: If true, the agent may call additional tools beyond the expected ones

**Scoring:**
- All expected tools called: score = 1.0 (pass)
- Missing tools: score = 1 - (missing count / expected count)
- Unexpected extra tools (when allowExtra is false): score = 0.5
- Wrong order (when ordered is true): score = 0.5

**Example -- ensure the agent reads a file before answering:**

| Field | Value |
|-------|-------|
| Expected Tools | \`search_files, read_file\` |
| Ordered | true |
| Allow Extra | true |

This verifies that the agent first searches for files, then reads a file, and may also call other tools.

**When to use:** For agents with connected GitHub repos or custom tools where you want to verify the agent actually uses its tools rather than hallucinating answers.

#### 4. Safety Check

Scans the agent's output (and optionally tool calls) for forbidden patterns using regex.

**Configuration fields:**
- **Forbidden Patterns**: Comma or newline separated regex patterns to detect
- **Scan Tool Calls**: If true, also scans tool call arguments and results

**Scoring:** Binary -- passes (score = 1.0) if zero forbidden patterns are found, fails (score = 0.0) if any are detected.

**Example -- block API keys, SQL injection, and XSS:**

| Field | Value |
|-------|-------|
| Forbidden Patterns | \`(api[_-]?key|secret[_-]?key|password)\\\\s*[:=]\\\\s*[\\\\w+/=]{16,}\` (newline) \`(DROP\\\\s+TABLE|DELETE\\\\s+FROM|UNION\\\\s+SELECT)\` (newline) \`<script[^>]*>\` (newline) \`(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36})\` |
| Scan Tool Calls | true |

**When to use:** For production agents where you must prevent leaking secrets, generating dangerous code, or XSS/injection attacks.

#### 5. Custom Script

Runs arbitrary JavaScript to evaluate the agent's response. The script runs in the same sandbox as tool code (5-second timeout, restricted globals).

**Configuration fields:**
- **Code**: JavaScript code that evaluates the output

**Available variables:**
- \`output\` (string) -- the agent's full text response
- \`toolCalls\` (array) -- all tool calls, each with \`{ name, args, result }\`

**Must return:** A JSON object: \`{ passed: boolean, score: number, message: string }\`

**Example -- check response length and structure:**

\`\`\`javascript
const words = output.split(/\\s+/).length;
const hasGreeting = /^(hello|hi|hey|good)/i.test(output.trim());
const hasConclusion = /(let me know|feel free|happy to help)/i.test(output);

const score = (
  (words >= 50 && words <= 500 ? 0.4 : 0) +
  (hasGreeting ? 0.3 : 0) +
  (hasConclusion ? 0.3 : 0)
);

return {
  passed: score >= 0.7,
  score: score,
  message: "Words: " + words + ", Greeting: " + hasGreeting + ", Conclusion: " + hasConclusion
};
\`\`\`

**Example -- verify tool was called with correct parameters:**

\`\`\`javascript
const readFileCalls = toolCalls.filter(tc => tc.name === "read_file");
const hasCorrectPath = readFileCalls.some(tc => tc.args.path && tc.args.path.includes("config"));

return {
  passed: readFileCalls.length > 0 && hasCorrectPath,
  score: readFileCalls.length > 0 ? (hasCorrectPath ? 1.0 : 0.5) : 0,
  message: "read_file calls: " + readFileCalls.length + ", correct path: " + hasCorrectPath
};
\`\`\`

**When to use:** For complex validation logic that cannot be expressed with the other criterion types -- response structure checks, multi-condition evaluations, custom scoring algorithms.

#### 6. LLM Judge

Uses another LLM to evaluate the agent's response on subjective criteria like helpfulness, empathy, accuracy, or tone. The judge LLM reads the agent's output, tool calls, and your rubric, then returns a score between 0.0 and 1.0.

**Configuration fields:**
- **Judge Provider**: LLM provider for the judge (default: Anthropic)
- **Judge Model**: Specific model (default: claude-sonnet-4-6)
- **Rubric**: Free-text evaluation instructions -- tell the judge exactly what to look for and how to score
- **Score Threshold**: Minimum score to pass (0.0 to 1.0, default: 0.7)

**How it works:** The judge LLM receives a structured prompt containing:
1. Your rubric text
2. The agent's full output
3. All tool calls with names, arguments, and results
4. Instructions to return a JSON object with \`score\` (0.0-1.0) and \`reasoning\`

The criterion passes if the returned score meets or exceeds the threshold.

**Example -- evaluate empathy and helpfulness:**

| Field | Value |
|-------|-------|
| Judge Provider | Anthropic |
| Judge Model | claude-sonnet-4-6 |
| Rubric | Rate this customer support response for empathy and helpfulness. Score 1.0 if the agent: (1) acknowledges the user's frustration, (2) provides a clear solution, (3) uses warm but professional tone, (4) ends with a follow-up question. Deduct 0.25 for each missing element. |
| Score Threshold | 0.7 |

**Example -- evaluate technical accuracy:**

| Field | Value |
|-------|-------|
| Judge Provider | OpenAI |
| Judge Model | gpt-4o |
| Rubric | Evaluate the technical accuracy of this code review. Check if: (1) all identified issues are real bugs (not false positives), (2) severity ratings are appropriate, (3) suggested fixes are correct and complete, (4) no significant issues were missed. Score 0.25 for each criterion met. |
| Score Threshold | 0.75 |

**When to use:** For subjective quality criteria that cannot be captured by pattern matching or scripts -- tone, creativity, reasoning quality, thoroughness. Note that LLM Judge results are non-deterministic (scores may vary slightly between runs).

### Running a Suite

1. Open your grading suite
2. Click the **Runs** section
3. Click **Run Suite**
4. Watch progress in real time -- each case shows its status (running, passed, failed) as it completes
5. When finished, see the overall suite score and per-case breakdown
6. Click any case to see:
   - The agent's full output
   - All tool calls made
   - Individual criterion scores and messages
   - The case's weighted average score

### Duplicating a Suite

To create a variation of an existing suite without losing the original:

1. Open the suite you want to clone
2. Click the **Duplicate** button
3. A new suite is created with all test cases and criteria copied
4. Modify the duplicate as needed (add cases, change criteria, adjust weights)

### Editing Cases After Creation

1. Open the grading suite containing the case
2. Find the test case you want to edit
3. Click the **pencil icon** next to the case name
4. Modify the input prompt, expected behavior, or criteria
5. Click **Save**

### Understanding Scores

**Per-criterion score**: Each criterion produces a score from 0.0 to 1.0.

**Per-case score**: Weighted average of all criteria scores in that case:

\`\`\`
Case Score = Sum(criterion_score * weight) / Sum(weights)
\`\`\`

A case passes if **all** criteria pass individually.

**Suite score**: Average of all case scores:

\`\`\`
Suite Score = Sum(case_scores) / number_of_cases
\`\`\`

### Tracking Progress

- Each grading run is saved with a timestamp and tied to the agent's current version
- The **score trend chart** shows scores across runs so you can visualize improvement or regression
- Compare runs before and after prompt changes to measure impact
- Your agent's latest grading score appears on its detail page card

---

## MCP Servers (API Deployment)

### Creating an MCP Server

MCP Servers expose your agent as a callable API endpoint that any application can integrate with.

1. Open your agent's detail page
2. Go to the **MCP Servers** tab
3. Click **New Server**
4. Enter:
   - **Name**: Server identifier (e.g., "Production API")
   - **Description**: What this server is for (e.g., "Customer support agent endpoint for the mobile app")
5. Click **Create**
6. **Copy the API key immediately** -- it is shown only once and cannot be retrieved later. The key starts with \`kpn_\` followed by 32 random hex bytes.
7. Save the key securely (environment variable, secrets manager, etc.)

### API Reference

**Endpoint**: \`POST /api/mcp\`

**Authentication**: Include the API key as a Bearer token in the Authorization header.

#### Initialize -- Get Agent Info

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1
}
\`\`\`

**Response:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "name": "Billing Support Agent",
    "description": "Handles billing inquiries and account lookups",
    "domain": "support",
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  }
}
\`\`\`

#### Completion -- Send a Message

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "completion/create",
  "params": {
    "message": "I need help with my billing. I was charged twice for order #12345.",
    "history": [
      {"role": "user", "content": "Hello"},
      {"role": "assistant", "content": "Hi! Welcome to CloudSync support. How can I help you today?"}
    ]
  },
  "id": 2
}
\`\`\`

**Response:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": "I'm sorry to hear about the double charge. Let me look into order #12345 for you...",
    "toolCalls": [],
    "metrics": {
      "inputTokens": 245,
      "outputTokens": 180,
      "cost": 0.0034
    }
  }
}
\`\`\`

The \`history\` field is optional. Include it for multi-turn conversations to give the agent context from previous exchanges.

### Code Examples

#### cURL

\`\`\`bash
# Get agent info
curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer kpn_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"initialize","id":1}'

# Send a message
curl -X POST https://your-domain.com/api/mcp \\
  -H "Authorization: Bearer kpn_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "completion/create",
    "params": {
      "message": "What is my current plan and billing date?"
    },
    "id": 2
  }'
\`\`\`

#### Node.js

\`\`\`javascript
async function callAgent(message, history = []) {
  const response = await fetch("https://your-domain.com/api/mcp", {
    method: "POST",
    headers: {
      "Authorization": "Bearer kpn_your_api_key_here",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "completion/create",
      params: { message, history },
      id: Date.now(),
    }),
  });

  const { result, error } = await response.json();

  if (error) {
    throw new Error(error.message);
  }

  return result;
}

// Simple call
const result = await callAgent("What are your pricing plans?");
console.log(result.content);

// Multi-turn conversation
const history = [];
const r1 = await callAgent("Hello", history);
history.push({ role: "user", content: "Hello" });
history.push({ role: "assistant", content: r1.content });

const r2 = await callAgent("I need help with billing", history);
console.log(r2.content);
\`\`\`

#### Python

\`\`\`python
import requests

API_URL = "https://your-domain.com/api/mcp"
API_KEY = "kpn_your_api_key_here"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}


def call_agent(message: str, history: list = None) -> dict:
    payload = {
        "jsonrpc": "2.0",
        "method": "completion/create",
        "params": {
            "message": message,
            "history": history or [],
        },
        "id": 1,
    }
    response = requests.post(API_URL, headers=HEADERS, json=payload)
    response.raise_for_status()
    data = response.json()

    if "error" in data:
        raise Exception(data["error"]["message"])

    return data["result"]


# Simple call
result = call_agent("Summarize our Q3 sales report")
print(result["content"])

# Multi-turn conversation
history = []
r1 = call_agent("Hello")
history.append({"role": "user", "content": "Hello"})
history.append({"role": "assistant", "content": r1["content"]})

r2 = call_agent("What are the pricing tiers?", history)
print(r2["content"])
print(f"Tokens used: {r2['metrics']['inputTokens']} in / {r2['metrics']['outputTokens']} out")
print(f"Cost: \${r2['metrics']['cost']}/.4f}")
\`\`\`

### API Key Security

- Keys use the \`kpn_\` prefix followed by 32 random hex bytes (64 characters total)
- **Only the SHA-256 hash** of the key is stored in Firestore -- the plaintext key is shown once at creation and never stored
- Lookup is O(1): the incoming key is hashed and matched against the stored hash
- You can create multiple keys per server for key rotation
- Delete compromised keys immediately from the **API Keys** page

### Usage Tracking

Token usage is tracked per MCP server per month, stored in Firestore at \`mcpServers/{serverId}/usage/{yearMonth}\`.

View usage in:
- The **API Keys** page (aggregate across all servers)
- Each server's detail page (per-server breakdown)
- The **Billing** page (combined with playground and grading usage)

---

## GitHub Integration

### Connecting GitHub

1. Go to **Settings** in the sidebar
2. Click **Connect GitHub**
3. A popup opens for GitHub OAuth authorization -- grant access with \`repo\` scope
4. After authorization, your GitHub account is linked to Kopern
5. Go to any agent's detail page
6. Click **Connect Repo** in the agent settings
7. Select the repositories you want the agent to access
8. Save -- the agent now has access to the selected repos

### How It Works

When an agent has connected repositories, Kopern enhances the agent in three ways:

1. **Context injection** (~1-2K tokens): The repository's file tree structure and README content are automatically included in the system prompt, giving the agent an overview of the project structure.

2. **read_file tool**: The agent can read the full content of any file in a connected repository by specifying the owner, repo, and file path. This calls the GitHub API on the server side using your stored access token.

3. **search_files tool**: The agent can search for files by name pattern across all connected repositories. This searches the file tree that was loaded during context injection.

### Per-Agent Repo Selection

Each agent can have different repositories connected. A DevOps agent might have access to infrastructure repos, while a documentation agent has access to docs repos. Configure this in each agent's settings.

### Troubleshooting

**"Account exists with different credential"**

This happens when you try to sign in with GitHub but already have an account with Google using the same email address.

Solution:
1. Sign in with **Google** first
2. Go to **Settings**
3. Click **Connect GitHub** -- this links GitHub as an additional auth provider to your existing account
4. Both sign-in methods now work for the same account

**Popup blocked**

If the GitHub OAuth popup is blocked by your browser:
1. Allow popups for the Kopern domain in your browser settings
2. Click **Connect GitHub** again
3. The popup should now open normally

**Repository not showing**

If a repository does not appear in the list:
- Verify you have access to the repository on GitHub
- The \`repo\` scope must be granted during OAuth authorization
- Try disconnecting and reconnecting GitHub in Settings

---

## Agent Teams

### Creating a Team

Agent Teams allow you to orchestrate multiple agents working together on a single task. Each team member contributes its specialized capabilities.

1. Go to **Teams** in the sidebar
2. Click **New Team**
3. Enter:
   - **Name**: Team identifier (e.g., "Content Review Pipeline")
   - **Description**: What this team does
   - **Execution Mode**: Sequential, Parallel, or Conditional
4. **Add members**: Select agents from your agent list and assign each a role description
5. Configure member order (for sequential mode)
6. Save the team

### Execution Modes

#### Sequential

Agents process in order. Each agent receives the original task plus the output of the previous agent.

\`\`\`
Input --> Agent A --> output A --> Agent B (input + output A) --> output B --> Agent C (input + output A + output B) --> Final Output
\`\`\`

**Best for**: Pipelines where each stage builds on the previous (writing, review, editing).

#### Parallel

All agents process the task simultaneously. Results are collected and combined.

\`\`\`
         +--> Agent A --> output A --+
Input -->+--> Agent B --> output B --+--> Combined Output
         +--> Agent C --> output C --+
\`\`\`

**Best for**: Tasks where multiple perspectives are valuable (multi-angle analysis, brainstorming).

#### Conditional

Input is routed to a specific agent based on conditions (content analysis, keywords, or classification).

\`\`\`
Input --> Classifier --> Agent A (if condition A)
                     --> Agent B (if condition B)
                     --> Agent C (default)
\`\`\`

**Best for**: Support escalation, request routing, multi-domain handling.

### Team Examples

#### 1. Content Pipeline

| Order | Agent | Role |
|-------|-------|------|
| 1 | Content Writer | Draft the article based on the topic and requirements |
| 2 | Technical Reviewer | Check factual accuracy, verify claims, flag unsupported statements |
| 3 | Copy Editor | Polish grammar, improve flow, ensure brand voice consistency |

**Mode**: Sequential -- each agent builds on the previous output.

#### 2. Analysis Team

| Order | Agent | Role |
|-------|-------|------|
| 1 | Data Researcher | Gather relevant data points and statistics from connected repos |
| 2 | Business Analyst | Interpret data, identify trends, draw conclusions |
| 3 | Executive Reporter | Synthesize findings into an executive summary with recommendations |

**Mode**: Sequential -- each stage adds analytical depth.

#### 3. Support Escalation

| Agent | Condition |
|-------|-----------|
| Tier 1 Support | General questions, FAQ, account basics |
| Tier 2 Technical | Technical issues, bug reports, API questions |
| Billing Specialist | Payment issues, refunds, plan changes |

**Mode**: Conditional -- routes based on the nature of the request.

### Team Metrics

When a team executes, Kopern tracks metrics across all members:
- Total tokens (input + output) for each member
- Combined cost
- Tool calls per member
- Execution time per member and total

---

## Pipelines

### Creating a Pipeline

Pipelines define **multi-step workflows** within a single agent. Unlike teams (multiple agents), pipelines use one agent but break its task into sequential steps with specific prompts.

1. Open your agent's detail page
2. Go to the **Pipelines** tab
3. Click **New Pipeline**
4. Enter:
   - **Name**: Pipeline identifier (e.g., "Code Review Pipeline")
   - **Description**: What this pipeline does
5. **Add steps**: Each step has:
   - **Name**: Step identifier (e.g., "Security Analysis")
   - **Prompt**: Specific instructions for this step
   - **Input mapping**: What data from previous steps to include
6. Save the pipeline

### How Steps Work

Each step runs as an independent LLM call with:
- The agent's system prompt and skills (shared across all steps)
- The step-specific prompt
- Output from previous steps (based on input mapping)
- Access to all agent tools

**Input mapping**: You can configure which previous step outputs are included as context for the current step. By default, each step sees the output of the immediately preceding step.

### Pipeline Examples

#### 1. Code Review Pipeline

| Step | Prompt | Purpose |
|------|--------|---------|
| 1. Parse | "List all changed files and their purposes. Categorize each as: new feature, bug fix, refactor, config change, or test." | Understand scope |
| 2. Security | "Analyze each changed file for security vulnerabilities: SQL injection, XSS, CSRF, hardcoded secrets, unvalidated input. Rate each finding as Critical/High/Medium/Low." | Security audit |
| 3. Performance | "Check for performance issues: N+1 queries, missing indexes, unnecessary loops, large payload sizes, memory leaks. Rate each finding." | Performance audit |
| 4. Report | "Compile all findings from previous steps into a structured review report with: summary, critical issues, recommendations, and overall score out of 10." | Final report |

#### 2. Content Pipeline

| Step | Prompt | Purpose |
|------|--------|---------|
| 1. Research | "Research the topic and list 5-10 key points to cover, with sources." | Gather material |
| 2. Outline | "Create a detailed article outline with sections, subsections, and key points for each." | Structure |
| 3. Draft | "Write the full article following the outline. Target 1500 words, use clear language." | First draft |
| 4. Polish | "Edit the draft for clarity, grammar, flow, and consistency. Ensure all claims are supported. Trim to under 1500 words." | Final polish |

---

## Sessions & Observability

### Viewing Sessions

Every Playground conversation creates a session that captures the full interaction timeline.

1. Open your agent's detail page
2. Go to the **Sessions** tab
3. See all past conversations listed with:
   - **Session title** (derived from your first message)
   - **Duration** (time from start to last message)
   - **Token count** (total input + output)
   - **Cost** (estimated from provider pricing)
   - **Tool call count**
   - **Status** (Active or Ended)
4. Click any session to see the **full timeline**:
   - Every message (user and assistant) with timestamps
   - Every tool call with arguments and results
   - Metrics at each step
5. Use the **Export** button to download the session as JSON

### Session Metrics

| Metric | Description |
|--------|-------------|
| **Tokens In** | Total input tokens consumed across all messages in the session |
| **Tokens Out** | Total output tokens generated across all messages |
| **Cost** | Estimated cost based on provider pricing |
| **Tool Calls** | Total number of tool invocations |
| **Messages** | Total message count (user + assistant) |
| **Duration** | Time from session start to last activity |

### Exporting Data

Click **Export** on any session to download the full trace as JSON. The export includes:

\`\`\`json
{
  "sessionId": "abc123",
  "agentId": "agent_456",
  "startedAt": "2026-03-10T14:30:00Z",
  "endedAt": "2026-03-10T14:35:22Z",
  "messages": [
    {
      "role": "user",
      "content": "What is my billing status?",
      "timestamp": "2026-03-10T14:30:00Z"
    },
    {
      "role": "assistant",
      "content": "Let me check your billing information...",
      "timestamp": "2026-03-10T14:30:02Z",
      "toolCalls": [
        {
          "name": "lookup_account",
          "args": { "userId": "user_789" },
          "result": "{ \\"plan\\": \\"Pro\\", \\"nextBilling\\": \\"2026-04-01\\" }"
        }
      ]
    }
  ],
  "metrics": {
    "inputTokens": 1250,
    "outputTokens": 830,
    "cost": 0.016,
    "toolCalls": 3
  }
}
\`\`\`

Use exports for compliance auditing, debugging, or feeding into external analytics.

---

## Billing & Usage

### Understanding Your Bill

Kopern tracks token usage and costs in real time. Every interaction -- Playground, Grading, Teams, Pipelines, MCP API calls -- is metered and recorded.

The **Billing** page shows:

- **Monthly totals**: Input tokens, output tokens, total cost
- **Request count**: Total API and Playground calls
- **Per-agent breakdown**: See which agents consume the most tokens and cost
- **Usage history chart**: Visual chart showing the last 6 months of usage

Billing data is written atomically to Firestore using \`FieldValue.increment()\`, ensuring accurate tracking even under concurrent usage.

### Plan Limits

| Feature | Starter (Free) | Pro | Usage | Enterprise |
|---------|----------------|-----|-------|------------|
| **Agents** | 2 | 25 | Unlimited | Unlimited |
| **Tokens/month** | 10,000 | 1,000,000 | Unlimited | 10,000,000 |
| **Grading runs/month** | 5 | 100 | Unlimited | Unlimited |
| **Teams** | 0 | 5 | Unlimited | Unlimited |
| **Pipelines** | 0 | 10 | Unlimited | Unlimited |
| **MCP endpoints** | 1 | 10 | Unlimited | Unlimited |
| **Meta-Agent wizard** | No | Yes | Yes | Yes |
| **Sub-agents** | No | Yes | Yes | Yes |

### Upgrading

1. Go to the **Pricing** page (accessible from the landing page or sidebar)
2. Compare plans and features
3. Click **Upgrade** on the plan you want
4. Complete payment
5. Your limits are updated immediately

You can also upgrade from the **Billing** page when you approach your plan limits -- a banner shows your current usage percentage.

### Provider Pricing

Token costs are based on the LLM provider you selected for each agent:

| Provider | Input (per 1M tokens) | Output (per 1M tokens) |
|----------|----------------------|------------------------|
| **Anthropic** | $3.00 | $15.00 |
| **OpenAI** | $2.50 | $10.00 |
| **Google** | $1.25 | $5.00 |
| **Ollama** (local) | Free | Free |

**Token estimation**: Kopern estimates tokens at ~4 characters per token. Exact counts come from provider APIs after each call.

**Tip**: Use Google (Gemini) for cost-sensitive applications with high volume. Use Anthropic (Claude) for tasks requiring the highest reasoning quality. Use Ollama for development and testing with no cost.

---

## Integrations Tutorial

### Custom Tools (Recommended)

The simplest way to integrate external services is through custom tools. The agent calls the tool during conversation, and the tool code communicates with the service.

#### Example: Slack Notification Tool

**Name**: \`send_slack_message\`
**Description**: Sends a message to a Slack channel. Use when the user asks to notify a team or post an update.

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
    channel: args.channel,
    text: args.message,
  }),
});
const data = await response.json();
return data.ok ? "Message sent successfully to " + args.channel : "Error: " + data.error;
\`\`\`

#### Example: Supabase Database Query

**Name**: \`query_database\`
**Description**: Queries a Supabase database table. Use when the user asks to look up data, check records, or search the database.

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "table": { "type": "string", "description": "Table name to query" },
    "query": { "type": "string", "description": "Filter expression (e.g. status=eq.active)" },
    "limit": { "type": "number", "description": "Max rows to return", "default": 10 }
  },
  "required": ["table"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const url = new URL("https://YOUR-PROJECT.supabase.co/rest/v1/" + args.table);
if (args.query) url.searchParams.set("select", "*");
if (args.limit) url.searchParams.set("limit", String(args.limit));
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

**Name**: \`create_jira_issue\`
**Description**: Creates a Jira issue. Use when the user wants to file a bug, create a task, or track a story.

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
      project: { key: args.project },
      summary: args.summary,
      description: {
        type: "doc", version: 1,
        content: [{ type: "paragraph", content: [{ type: "text", text: args.description || "" }] }]
      },
      issuetype: { name: args.issueType || "Task" },
    },
  }),
});
const data = await response.json();
return data.key ? "Created issue: " + data.key : "Error: " + JSON.stringify(data.errors);
\`\`\`

### MCP Server Deployment

When you want external applications to call your Kopern agent, deploy it as an MCP Server and use the webhook pattern:

\`\`\`javascript
// Example: GitHub webhook handler that calls your Kopern agent for PR reviews
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
        params: {
          message: "Review this PR:\\n\\nTitle: " + event.pull_request.title +
                   "\\nDescription: " + event.pull_request.body +
                   "\\nChanged files: " + event.pull_request.changed_files
        },
        id: 1,
      }),
    });

    const { result } = await response.json();

    // Post the review as a GitHub PR comment
    await fetch(event.pull_request.comments_url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer ghp_your_github_token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: result.content }),
    });
  }

  res.sendStatus(200);
});
\`\`\`

### Agent Teams for Multi-Service Orchestration

For workflows that span multiple services, create specialized agents and orchestrate them as a team:

1. **Slack Monitor Agent** -- tool: read Slack messages from a channel
2. **Jira Agent** -- tool: create and update Jira issues from the findings
3. **Summary Agent** -- synthesize results into a Slack summary post

Create a team with sequential mode. When executed, each agent processes the task and passes its output to the next, creating an automated workflow across services.

---

## Security

### Data Security

- **Firestore rules**: All user data is protected by owner-only security rules. Only authenticated users can read/write their own data. No cross-user access is possible.
- **API keys**: Keys use the \`kpn_\` prefix and are hashed with SHA-256 before storage. The plaintext key is never stored or logged.
- **GitHub tokens**: OAuth tokens are stored securely in the user document in Firestore. They are only used server-side when the agent calls GitHub tools.
- **HTTPS**: All communication between client and server is encrypted.

### Sandbox

Custom tool code and grading scripts execute in a **Node.js \`vm\` module sandbox** with strict isolation:

- **Restricted globals**: Only safe built-in objects are exposed (JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp, Error, Map, Set, Promise, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent)
- **No network access**: \`fetch\`, \`XMLHttpRequest\`, and \`http\` are not available
- **No file system**: \`fs\`, \`path\`, and \`child_process\` are not available
- **No module loading**: \`require\` and \`import\` are blocked
- **5-second timeout**: Code that runs longer than 5 seconds is terminated
- **No process access**: \`process\`, \`global\`, and \`globalThis\` are not exposed

### Best Practices

1. **Never hardcode secrets in tool code** -- use environment variables or a secrets manager. If you must include API keys in tool code, create a dedicated key with minimal permissions.
2. **Use read-only tokens** when the agent only needs to read data (e.g., GitHub read-only access for code review agents).
3. **Add safety extensions** -- use the \`tool_call_blocked\` event to prevent tools from being called with dangerous parameters.
4. **Enable Safety Check grading criteria** -- detect harmful patterns before deploying to production.
5. **Test before production** -- always validate agent behavior in the Playground and with Grading before creating MCP Servers.
6. **Monitor usage** -- check the Billing page regularly to catch unexpected API consumption.
7. **Rotate API keys** -- regenerate MCP Server keys periodically and after any suspected compromise.

---

## FAQ

**Can I use my own API keys for LLM providers?**
Not yet. Kopern manages provider access and billing. This ensures consistent pricing and simplifies usage tracking. Self-hosted Ollama models are supported if you want to run models locally at no cost.

**What models are supported?**
Kopern supports four providers:
- **Anthropic**: Claude Sonnet, Claude Opus
- **OpenAI**: GPT-4o, GPT-4.1
- **Google**: Gemini 2.0 Flash, Gemini 2.5 Pro
- **Ollama**: Any locally hosted model

**Is there a free tier?**
Yes. The Starter plan is free and includes 2 agents, 10,000 tokens/month, 5 grading runs/month, and 1 MCP endpoint. No credit card required.

**Can agents call external APIs?**
Yes, via custom tools. Write JavaScript code that calls any HTTP API. See the Custom Tools section for examples with Slack, Supabase, and Jira.

**How do I connect Slack, Jira, or other services?**
Create custom tools that call the service's API. See the Integrations Tutorial section for step-by-step examples. For consuming your agent from external services, deploy it as an MCP Server.

**What happens when I hit my plan limit?**
You receive a clear error message indicating which limit was reached (tokens, agents, grading runs, etc.) and a prompt to upgrade your plan. Existing agents continue to work for read operations but new interactions are blocked.

**Can I export my agent?**
Yes, in two ways:
1. **Version snapshots**: Every time you publish, a version snapshot is saved with the complete agent configuration.
2. **Session export**: Export any session as JSON for debugging or compliance.

**Is my data private?**
Yes. Firestore security rules enforce owner-only access to all data. No other user can read your agents, sessions, or billing data. API keys are SHA-256 hashed. GitHub tokens are stored in your user document only.

**Can I duplicate an agent?**
You can duplicate grading suites within an agent. To copy a full agent, use the Examples gallery: create an example from your agent, then use "Use this Agent" to create a copy.

**How does the Meta-Agent Wizard work?**
The wizard is an AI agent itself. You describe what you want in plain English, and it generates a complete agent specification: name, description, domain, system prompt, skills, tools, and grading cases. The generation streams in real time via SSE. You can review and customize everything before saving.

**What is the maximum conversation length?**
There is no hard limit on conversation length, but very long conversations consume more tokens (and cost more). The agent's context window depends on the model: Claude Sonnet supports ~200K tokens, GPT-4o supports ~128K tokens, Gemini 2.5 Pro supports ~1M tokens.

**Can multiple agents share the same tools?**
Tools are defined per-agent. To reuse tools across agents, you can copy the tool configuration manually or use agent templates from the Examples gallery.

**How do grading scores affect my agent?**
Grading scores are informational only -- they do not automatically change agent behavior. Use scores to identify weaknesses, then manually update the system prompt, skills, or tools to address them. Re-run the suite to verify improvements.
`;
