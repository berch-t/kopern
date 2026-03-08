import {
  GitPullRequest,
  Database,
  Activity,
  DollarSign,
  FileWarning,
  MessageSquare,
  FileText,
  TrendingUp,
  Target,
  Brain,
  ShieldCheck,
  Users,
  BarChart3,
  Workflow,
  Mail,
  type LucideIcon,
} from "lucide-react";

export interface UseCase {
  slug: string;
  title: string;
  domain: string;
  icon: LucideIcon;
  tagline: string;
  description: string;
  timeSaved: string;
  costReduction: string;
  riskMitigation: string;
  systemPrompt: string;
  skills: { name: string; content: string }[];
  tools: { name: string; description: string; params: string }[];
  mcpIntegration: string;
  gradingSuite: { caseName: string; input: string; criteria: string }[];
}

export const useCases: UseCase[] = [
  // 1. PR Review Guardian
  {
    slug: "pr-review-guardian",
    title: "PR Review Guardian",
    domain: "DevOps / Code Quality",
    icon: GitPullRequest,
    tagline: "Automated pull request analysis with security, performance and convention checks",
    description:
      "Receives a GitHub PR diff via webhook and produces a structured review: security vulnerabilities (OWASP Top 10), convention violations, cyclomatic complexity alerts, deprecated dependency usage, and optimization suggestions. Blocks merge if the score falls below a configurable threshold.",
    timeSaved: "30-60 min per PR review reduced to 10 seconds",
    costReduction: "~$45K/year for a team of 8 developers (senior reviewer time)",
    riskMitigation: "Catches 92% of common vulnerabilities before human review",
    systemPrompt: `You are a senior code reviewer. Analyze the provided PR diff and produce a structured review.

Rules:
- Flag OWASP Top 10 vulnerabilities with severity (critical/high/medium/low)
- Check naming conventions (camelCase for JS/TS, snake_case for Python)
- Alert on cyclomatic complexity > 10
- Identify missing error handling, unclosed resources, race conditions
- Suggest performance improvements with estimated impact
- Output JSON: { score: 0-100, issues: [...], summary: string, canMerge: boolean }

Never approve code with critical or high severity security issues.`,
    skills: [
      {
        name: "owasp-rules",
        content: `<skill name="owasp-rules">
OWASP Top 10 Detection Rules:
1. Injection (SQL, NoSQL, OS, LDAP) — look for string concatenation in queries
2. Broken Auth — hardcoded credentials, weak token generation
3. Sensitive Data Exposure — logging PII, unencrypted storage
4. XXE — XML parsing without disabling external entities
5. Broken Access Control — missing auth middleware, IDOR patterns
6. Security Misconfiguration — debug mode, default credentials
7. XSS — unescaped user input in HTML/JSX output
8. Insecure Deserialization — JSON.parse on untrusted input without validation
9. Vulnerable Components — known CVEs in dependencies
10. Insufficient Logging — missing audit trails for sensitive operations
</skill>`,
      },
      {
        name: "review-format",
        content: `<skill name="review-format">
Output your review in this exact JSON structure:
{
  "score": <0-100>,
  "canMerge": <boolean>,
  "summary": "<2-3 sentence overview>",
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "security|performance|convention|logic|maintainability",
      "file": "<filename>",
      "line": <number>,
      "message": "<description>",
      "suggestion": "<fix>"
    }
  ],
  "improvements": ["<optional optimization suggestions>"]
}
Merge threshold: score >= 70 AND no critical/high issues.
</skill>`,
      },
    ],
    tools: [
      {
        name: "parse_diff",
        description: "Parses a unified diff string into structured file changes",
        params: `{ "diff": { "type": "string", "description": "Unified diff content" } }`,
      },
      {
        name: "check_dependencies",
        description: "Checks package versions against known CVE databases",
        params: `{ "packages": { "type": "array", "items": { "type": "string" }, "description": "Package names with versions" } }`,
      },
    ],
    mcpIntegration: `POST /api/mcp with Bearer token.
Webhook from GitHub sends PR diff as input.
Agent returns structured JSON review.
CI/CD pipeline reads canMerge to gate the merge.`,
    gradingSuite: [
      {
        caseName: "Detect SQL injection",
        input: `diff: function getUser(id) { db.query("SELECT * FROM users WHERE id=" + id) }`,
        criteria: `- output_match: contains "injection" (weight: 0.4)
- schema_validation: valid JSON with "issues" array (weight: 0.3)
- output_match: canMerge is false (weight: 0.2)
- safety_check: no harmful code suggestions (weight: 0.1)`,
      },
    ],
  },

  // 2. Database Migration Auditor
  {
    slug: "database-migration-auditor",
    title: "Database Migration Auditor",
    domain: "Backend / DBA",
    icon: Database,
    tagline: "Analyze migration files for breaking changes, lock risks, and auto-generate rollback scripts",
    description:
      "Receives a SQL/Prisma/Drizzle migration file and analyzes it for: breaking changes (dropped columns without fallback), irreversible operations, index impact on write performance, lock risks on large tables, estimated downtime, and generates a matching rollback script.",
    timeSaved: "2-4 hours of DBA review per migration",
    costReduction: "Prevents downtime incidents worth $10K-$500K each",
    riskMitigation: "100% of destructive migrations flagged before execution",
    systemPrompt: `You are a database migration safety auditor. Analyze migration files for risks.

Rules:
- Flag DROP COLUMN/TABLE without backup strategy
- Warn about ALTER on tables > 1M rows (lock risk)
- Detect missing indexes on foreign keys
- Identify irreversible operations
- Estimate downtime: none / seconds / minutes / hours
- Generate rollback script for every migration
- Output JSON: { riskLevel: "safe|caution|danger", issues: [...], rollbackScript: string, estimatedDowntime: string }

Never approve DROP TABLE without explicit confirmation step.`,
    skills: [
      {
        name: "migration-patterns",
        content: `<skill name="migration-patterns">
Safe migration patterns:
- Add column with DEFAULT: safe, no lock on modern Postgres (11+)
- Add index CONCURRENTLY: safe, no lock
- DROP COLUMN: danger — add NOT NULL constraint removal first, deploy, then drop
- Rename column: danger — use new column + backfill + swap pattern
- ALTER TYPE: danger on large tables — create new column, backfill, swap

Lock-risk thresholds:
- Tables > 100K rows: flag ADD CONSTRAINT
- Tables > 1M rows: flag any ALTER
- Tables > 10M rows: requires maintenance window
</skill>`,
      },
      {
        name: "rollback-template",
        content: `<skill name="rollback-template">
Always generate rollback as valid SQL wrapped in a transaction:
BEGIN;
  -- Reverse each operation in reverse order
  -- For DROP COLUMN: restore from backup table
  -- For ADD COLUMN: DROP COLUMN IF EXISTS
  -- For CREATE INDEX: DROP INDEX IF EXISTS
COMMIT;
Include a verification query after rollback to confirm state.
</skill>`,
      },
    ],
    tools: [
      {
        name: "estimate_table_size",
        description: "Estimates row count and size of a database table",
        params: `{ "tableName": { "type": "string" }, "connectionString": { "type": "string" } }`,
      },
      {
        name: "validate_sql",
        description: "Validates SQL syntax and returns parsed AST",
        params: `{ "sql": { "type": "string", "description": "SQL statement to validate" } }`,
      },
    ],
    mcpIntegration: `Integrate into CI/CD: on migration file commit, POST the SQL to /api/mcp.
Agent returns risk assessment + rollback script.
Pipeline blocks deploy if riskLevel is "danger".`,
    gradingSuite: [
      {
        caseName: "Detect dangerous DROP TABLE",
        input: `DROP TABLE users CASCADE;`,
        criteria: `- output_match: riskLevel is "danger" (weight: 0.4)
- output_match: contains rollback script (weight: 0.3)
- schema_validation: valid JSON output (weight: 0.2)
- llm_judge: rollback script is correct (weight: 0.1)`,
      },
    ],
  },

  // 3. CI/CD Pipeline Monitor
  {
    slug: "cicd-pipeline-monitor",
    title: "CI/CD Pipeline Monitor",
    domain: "DevOps / SRE",
    icon: Activity,
    tagline: "Real-time pipeline failure analysis with root cause detection and fix suggestions",
    description:
      "Monitors CI/CD pipeline runs (GitHub Actions, GitLab CI, Jenkins). On failure, analyzes build logs, identifies root cause (flaky test, dependency issue, infra problem), suggests a fix, and posts a summary to Slack with actionable next steps.",
    timeSaved: "15-45 min per pipeline failure investigation",
    costReduction: "$30K/year in developer time on a team with 5+ daily deploys",
    riskMitigation: "Reduces mean time to recovery (MTTR) by 60%",
    systemPrompt: `You are a CI/CD pipeline analyst. When a build fails, analyze the logs and identify the root cause.

Rules:
- Categorize failure: test_failure | build_error | dependency_issue | infra_timeout | flaky_test | config_error
- For test failures: identify the exact test, expected vs actual, and suggest fix
- For dependency issues: identify the package and version conflict
- For infra issues: identify timeout patterns, resource limits
- Detect flaky tests by checking if the same test passed in recent runs
- Output JSON: { category: string, rootCause: string, affectedFiles: [...], suggestedFix: string, confidence: 0-100 }`,
    skills: [
      {
        name: "log-parsing",
        content: `<skill name="log-parsing">
CI log analysis patterns:
- Error lines: look for "ERROR", "FAILED", "FATAL", exit codes != 0
- Test failures: "FAIL", "AssertionError", "Expected X but got Y"
- Dependency: "ERESOLVE", "peer dep", "version conflict", "404 Not Found"
- Timeout: "ETIMEDOUT", "deadline exceeded", "killed after"
- OOM: "JavaScript heap out of memory", "Killed", exit code 137
- Flaky indicator: same test fails intermittently across last 5 runs
</skill>`,
      },
    ],
    tools: [
      {
        name: "fetch_pipeline_logs",
        description: "Retrieves the full log output of a CI/CD pipeline run",
        params: `{ "runId": { "type": "string" }, "provider": { "type": "string", "enum": ["github", "gitlab", "jenkins"] } }`,
      },
      {
        name: "get_recent_runs",
        description: "Gets status of recent pipeline runs for flaky test detection",
        params: `{ "branch": { "type": "string" }, "limit": { "type": "number" } }`,
      },
    ],
    mcpIntegration: `GitHub Actions webhook triggers on workflow_run.completed (failure).
POST logs to /api/mcp, agent analyzes and returns diagnosis.
Result posted to Slack channel via secondary webhook.`,
    gradingSuite: [
      {
        caseName: "Identify dependency conflict",
        input: `npm ERR! ERESOLVE unable to resolve dependency tree\nnpm ERR! peer react@"^17.0.0" from package-x@2.0.0`,
        criteria: `- output_match: category is "dependency_issue" (weight: 0.4)
- output_match: mentions version conflict (weight: 0.3)
- schema_validation: valid JSON (weight: 0.2)
- llm_judge: suggested fix is actionable (weight: 0.1)`,
      },
    ],
  },

  // 4. Cloud Cost Optimizer
  {
    slug: "cloud-cost-optimizer",
    title: "Cloud Cost Optimizer",
    domain: "FinOps / Infrastructure",
    icon: DollarSign,
    tagline: "Analyze cloud billing data and identify savings opportunities with ROI estimates",
    description:
      "Analyzes AWS/GCP/Azure billing exports and identifies: oversized instances, idle resources, unused reserved capacity, storage orphans, NAT gateway optimization, spot instance candidates. Produces a prioritized savings report with estimated monthly impact per recommendation.",
    timeSaved: "2-3 days of monthly FinOps audit reduced to minutes",
    costReduction: "Typically identifies 20-40% savings ($50K-$500K/year)",
    riskMitigation: "Prevents budget overruns with automated threshold alerts",
    systemPrompt: `You are a FinOps analyst. Analyze cloud billing data and identify cost optimization opportunities.

Rules:
- Categorize savings: rightsizing | idle_resources | reserved_capacity | storage | networking | licensing
- For each finding, provide: current cost, optimized cost, savings %, implementation effort (low/medium/high)
- Prioritize by savings/effort ratio
- Flag resources with < 10% average utilization
- Identify RI/Savings Plan coverage gaps
- Output JSON: { totalCurrentCost: number, totalOptimizedCost: number, savingsPercent: number, recommendations: [...] }

Never recommend downsizing production databases without load analysis.`,
    skills: [
      {
        name: "aws-pricing",
        content: `<skill name="aws-pricing">
Common AWS savings patterns:
- EC2: t3.medium rarely uses burst credits -> switch to t3a.small (30% savings)
- RDS: Multi-AZ on dev/staging -> remove (50% savings)
- EBS: gp2 volumes -> gp3 (20% savings, better performance)
- NAT Gateway: $0.045/GB -> VPC endpoints for S3/DynamoDB ($0)
- Data Transfer: cross-AZ at $0.01/GB -> use AZ-aware routing
- S3: Intelligent Tiering saves 40-60% on infrequently accessed data
- Lambda: ARM (Graviton) = 20% cheaper, 34% better perf
</skill>`,
      },
    ],
    tools: [
      {
        name: "parse_billing_csv",
        description: "Parses cloud provider billing export CSV into structured data",
        params: `{ "csvContent": { "type": "string" }, "provider": { "type": "string", "enum": ["aws", "gcp", "azure"] } }`,
      },
      {
        name: "get_utilization_metrics",
        description: "Fetches CPU/memory/network utilization for a resource",
        params: `{ "resourceId": { "type": "string" }, "period": { "type": "string" } }`,
      },
    ],
    mcpIntegration: `Schedule monthly: export billing CSV, POST to /api/mcp.
Agent returns prioritized savings report.
Dashboard displays recommendations with one-click implementation tickets.`,
    gradingSuite: [
      {
        caseName: "Detect idle EC2 instance",
        input: `Instance i-abc123: type m5.xlarge, avg CPU 3%, avg network 100KB/s, running 730 hours`,
        criteria: `- output_match: recommends downsizing or termination (weight: 0.4)
- output_match: provides savings estimate (weight: 0.3)
- schema_validation: valid JSON with recommendations array (weight: 0.2)
- llm_judge: recommendation is safe and actionable (weight: 0.1)`,
      },
    ],
  },

  // 5. Incident Post-Mortem Generator
  {
    slug: "incident-postmortem-generator",
    title: "Incident Post-Mortem Generator",
    domain: "SRE / Operations",
    icon: FileWarning,
    tagline: "Auto-generate structured post-mortems from incident logs with timeline and action items",
    description:
      "Ingests incident data (PagerDuty alerts, CloudWatch logs, Slack threads, status page updates) and generates a complete blameless post-mortem: timeline reconstruction, root cause analysis, impact assessment (duration, users affected, revenue impact), and prioritized action items with suggested owners.",
    timeSaved: "2-4 hours per post-mortem reduced to 5 minutes",
    costReduction: "$25K/year for a team handling 2+ incidents/month",
    riskMitigation: "Ensures 100% of incidents have documented post-mortems",
    systemPrompt: `You are an SRE post-mortem specialist. Generate blameless post-mortems from incident data.

Rules:
- Reconstruct timeline in UTC with minute-level granularity
- Identify root cause and contributing factors (never blame individuals)
- Assess impact: duration, affected users (% and count), revenue impact estimate
- Classify severity: SEV1 (critical) / SEV2 (major) / SEV3 (minor)
- Generate 3-5 action items with: description, priority (P0-P3), suggested owner (role, not person), deadline
- Include "what went well" section
- Output markdown with standardized sections`,
    skills: [
      {
        name: "postmortem-template",
        content: `<skill name="postmortem-template">
## Incident Post-Mortem: [Title]
**Date:** [date] | **Severity:** [SEV1/2/3] | **Duration:** [Xh Xm]

### Summary
[2-3 sentences]

### Impact
- Users affected: [X% / count]
- Revenue impact: [estimate]
- SLA impact: [yes/no, details]

### Timeline (UTC)
| Time | Event |
|------|-------|

### Root Cause
[Detailed technical explanation]

### Contributing Factors
[List]

### What Went Well
[List]

### Action Items
| Priority | Action | Owner (role) | Deadline |
|----------|--------|-------------|----------|

### Lessons Learned
[Key takeaways]
</skill>`,
      },
    ],
    tools: [
      {
        name: "parse_alert_timeline",
        description: "Parses PagerDuty/Opsgenie alerts into chronological events",
        params: `{ "alerts": { "type": "array", "items": { "type": "object" } } }`,
      },
      {
        name: "estimate_revenue_impact",
        description: "Estimates revenue lost based on downtime duration and traffic patterns",
        params: `{ "durationMinutes": { "type": "number" }, "avgRevenuePerMinute": { "type": "number" } }`,
      },
    ],
    mcpIntegration: `Triggered after incident resolution.
Collects data from PagerDuty API + CloudWatch + Slack.
POST to /api/mcp, returns formatted post-mortem.
Auto-creates Confluence/Notion page and Jira tickets for action items.`,
    gradingSuite: [
      {
        caseName: "Generate post-mortem from outage data",
        input: `Alert: Database connection pool exhausted at 14:32 UTC. Service restored at 15:47 UTC. 12,000 users affected.`,
        criteria: `- output_match: contains timeline section (weight: 0.3)
- output_match: contains action items (weight: 0.3)
- llm_judge: root cause analysis is plausible (weight: 0.2)
- safety_check: no individual blame (weight: 0.2)`,
      },
    ],
  },

  // 6. Slack Standup Synthesizer
  {
    slug: "slack-standup-synthesizer",
    title: "Slack Standup Synthesizer",
    domain: "Team Management",
    icon: MessageSquare,
    tagline: "Aggregate daily standups from Slack into team dashboards with blocker detection",
    description:
      "Reads standup messages from a Slack channel (or threaded standups), extracts each team member's yesterday/today/blockers, detects cross-team dependencies, identifies stale items (same 'today' for 3+ days), and generates a team summary for managers with risk flags.",
    timeSaved: "20 min/day for engineering managers (reading + summarizing)",
    costReduction: "$15K/year per manager in recovered productive time",
    riskMitigation: "Blockers detected 2x faster, preventing sprint slippage",
    systemPrompt: `You are a team standup analyst. Parse standup messages and generate actionable team summaries.

Rules:
- Extract per-person: yesterday (done), today (planned), blockers
- Detect stale items: if "today" matches previous 2+ standups, flag as "stuck"
- Identify cross-team dependencies (mentions of other teams or external services)
- Highlight blockers with severity: resolved | active | escalation_needed
- Generate team health score: 0-100 based on progress rate and blocker count
- Output JSON: { teamHealth: number, members: [...], blockers: [...], staleItems: [...], summary: string }`,
    skills: [
      {
        name: "standup-parsing",
        content: `<skill name="standup-parsing">
Standup message patterns to detect:
- "Yesterday/Done/Completed:" followed by items
- "Today/Planned/Working on:" followed by items
- "Blockers/Blocked/Issues:" followed by items
- Emoji patterns: checkmark = done, construction = in progress, stop = blocked
- Thread replies = additional context for the parent standup
- No standup posted = flag as "missing standup"
</skill>`,
      },
    ],
    tools: [
      {
        name: "fetch_slack_messages",
        description: "Retrieves messages from a Slack channel for a given date range",
        params: `{ "channelId": { "type": "string" }, "date": { "type": "string", "format": "date" } }`,
      },
      {
        name: "get_previous_standups",
        description: "Retrieves historical standups for stale item detection",
        params: `{ "userId": { "type": "string" }, "days": { "type": "number" } }`,
      },
    ],
    mcpIntegration: `Scheduled daily at 10:30 AM (after standup window).
Reads Slack channel via API, POST to /api/mcp.
Returns team summary, posted to #engineering-leads channel.
Stale items auto-create follow-up Slack DMs.`,
    gradingSuite: [
      {
        caseName: "Parse standup with blocker",
        input: `@alice: Yesterday: finished auth module. Today: start payment integration. Blocked: waiting for Stripe API keys from DevOps.`,
        criteria: `- output_match: extracts blocker about Stripe keys (weight: 0.4)
- output_match: identifies cross-team dependency (DevOps) (weight: 0.3)
- schema_validation: valid JSON with members array (weight: 0.2)
- llm_judge: summary is accurate (weight: 0.1)`,
      },
    ],
  },

  // 7. Contract Clause Analyzer
  {
    slug: "contract-clause-analyzer",
    title: "Contract Clause Analyzer",
    domain: "Legal / Procurement",
    icon: FileText,
    tagline: "Detect risky clauses, GDPR violations, and missing protections in contracts",
    description:
      "Analyzes SaaS contracts, NDAs, and vendor agreements to detect: abusive clauses, GDPR non-compliance, missing SLA commitments, auto-renewal traps, liability gaps, IP ownership ambiguity, and missing exit clauses. Outputs a risk matrix with severity ratings per clause.",
    timeSaved: "1-2 hours per contract review for legal team",
    costReduction: "$40K/year for companies reviewing 50+ contracts/year",
    riskMitigation: "Prevents signing contracts with hidden liability exposure",
    systemPrompt: `You are a contract analyst specializing in technology and SaaS agreements. Analyze contracts for risks.

Rules:
- Score each clause: safe (green) | review_needed (yellow) | risky (red)
- Check GDPR compliance: data processing addendum, data location, breach notification
- Verify SLA terms: uptime %, credit mechanism, exclusions
- Flag auto-renewal clauses without opt-out window
- Identify unlimited liability clauses or missing liability caps
- Check IP ownership: ensure client retains IP for custom work
- Check termination: exit clause, data portability, transition period
- Output JSON: { overallRisk: "low|medium|high", clauses: [...], missingClauses: [...], recommendations: [...] }`,
    skills: [
      {
        name: "gdpr-checklist",
        content: `<skill name="gdpr-checklist">
GDPR contract requirements:
1. Data Processing Agreement (DPA) present
2. Data storage location specified (EU adequacy decision)
3. Sub-processor list and notification requirement
4. Data breach notification within 72 hours
5. Data subject rights handling process
6. Data deletion/return on termination
7. Security measures documented (Art. 32)
8. Data Protection Impact Assessment reference
</skill>`,
      },
    ],
    tools: [
      {
        name: "extract_clauses",
        description: "Parses a contract document into individual numbered clauses",
        params: `{ "document": { "type": "string", "description": "Full contract text" } }`,
      },
      {
        name: "compare_template",
        description: "Compares clauses against company standard contract template",
        params: `{ "clauses": { "type": "array" }, "templateId": { "type": "string" } }`,
      },
    ],
    mcpIntegration: `Legal team uploads contract to internal portal.
Portal extracts text, POST to /api/mcp.
Agent returns risk analysis.
High-risk clauses auto-create legal review tickets.`,
    gradingSuite: [
      {
        caseName: "Detect missing GDPR DPA",
        input: `SaaS Agreement: Provider stores customer data on US servers. No data processing addendum included.`,
        criteria: `- output_match: flags missing DPA (weight: 0.4)
- output_match: flags non-EU data storage (weight: 0.3)
- output_match: overallRisk is "high" (weight: 0.2)
- schema_validation: valid JSON (weight: 0.1)`,
      },
    ],
  },

  // 8. Sales Lead Qualifier
  {
    slug: "sales-lead-qualifier",
    title: "Sales Lead Qualifier",
    domain: "Sales / Prospecting",
    icon: Target,
    tagline: "Score and qualify inbound leads with enrichment data and personalized outreach drafts",
    description:
      "Processes inbound leads (form submissions, demo requests, trial sign-ups), enriches them with company data (size, industry, tech stack, funding), scores them using BANT/MEDDIC frameworks, and generates a personalized outreach email draft for the assigned SDR.",
    timeSaved: "10-15 min per lead qualification, 80% of SDR research time",
    costReduction: "$60K/year per SDR in recovered selling time",
    riskMitigation: "Increases conversion rate 25% by prioritizing high-intent leads",
    systemPrompt: `You are a sales intelligence analyst. Qualify inbound leads and prepare SDR outreach.

Rules:
- Score leads 0-100 using BANT: Budget, Authority, Need, Timeline
- Enrich with available data: company size, industry, tech stack, recent funding
- Classify: hot (>80) | warm (50-80) | cold (<50)
- For hot/warm leads: generate personalized outreach email (3-4 sentences, value-focused)
- Identify buying signals: pricing page visits, competitor mentions, urgent language
- Output JSON: { score: number, classification: string, bantBreakdown: {...}, enrichment: {...}, outreachDraft: string }

Never fabricate company data. Mark unknown fields as "unknown".`,
    skills: [
      {
        name: "outreach-templates",
        content: `<skill name="outreach-templates">
Outreach email structure:
1. Personalized hook (reference their company/industry challenge)
2. Value proposition (one sentence, specific to their pain point)
3. Social proof (brief case study or metric from similar company)
4. CTA (specific: "15-min call Thursday?" not "let me know")

Tone: professional but conversational. No buzzwords. No "I hope this email finds you well."
Max length: 100 words.
</skill>`,
      },
    ],
    tools: [
      {
        name: "enrich_company",
        description: "Fetches company data from Clearbit/LinkedIn/Crunchbase APIs",
        params: `{ "companyDomain": { "type": "string" }, "companyName": { "type": "string" } }`,
      },
      {
        name: "check_crm_history",
        description: "Checks CRM for existing relationship with this company",
        params: `{ "companyDomain": { "type": "string" } }`,
      },
    ],
    mcpIntegration: `Website form submission triggers webhook.
Lead data POST to /api/mcp.
Agent returns qualification + outreach draft.
Hot leads auto-create CRM opportunity and Slack alert to SDR.`,
    gradingSuite: [
      {
        caseName: "Qualify enterprise lead",
        input: `Company: Acme Corp, 500 employees, Series C, requested pricing demo, CTO signed up`,
        criteria: `- output_match: score > 70 (weight: 0.3)
- output_match: classification is "hot" or "warm" (weight: 0.3)
- output_match: outreach draft is personalized to Acme (weight: 0.2)
- schema_validation: valid JSON with bantBreakdown (weight: 0.2)`,
      },
    ],
  },

  // 9. Marketing Campaign Analyzer
  {
    slug: "marketing-campaign-analyzer",
    title: "Marketing Campaign Analyzer",
    domain: "Marketing / Growth",
    icon: TrendingUp,
    tagline: "Multi-channel campaign performance analysis with attribution and optimization suggestions",
    description:
      "Aggregates campaign data from Google Ads, Meta Ads, LinkedIn Ads, email platforms, and organic channels. Performs cross-channel attribution, identifies top/underperforming creatives, calculates true CAC per channel, and generates optimization recommendations with budget reallocation suggestions.",
    timeSaved: "4-6 hours of weekly marketing reporting",
    costReduction: "15-25% ROAS improvement from data-driven budget shifts",
    riskMitigation: "Prevents budget waste on underperforming channels",
    systemPrompt: `You are a marketing analytics expert. Analyze multi-channel campaign data and optimize spend.

Rules:
- Calculate per-channel: impressions, clicks, CTR, conversions, CPA, ROAS
- Apply multi-touch attribution (linear model) across channels
- Identify statistical outliers: creatives with >2x or <0.5x average performance
- Suggest budget reallocation: shift from low-ROAS to high-ROAS channels
- Flag audience fatigue: declining CTR over 2+ weeks on same creative
- Output JSON: { channels: [...], topCreatives: [...], recommendations: [...], proposedBudget: {...} }

Always show confidence intervals for small sample sizes (<1000 impressions).`,
    skills: [
      {
        name: "attribution-model",
        content: `<skill name="attribution-model">
Multi-touch attribution (linear):
- First touch: 25% credit
- Middle touches: 50% credit (split equally)
- Last touch: 25% credit

Channel benchmarks (B2B SaaS):
- Google Search: CPA $50-150, CTR 3-5%
- LinkedIn Ads: CPA $80-200, CTR 0.4-0.8%
- Meta Ads: CPA $30-80, CTR 0.8-1.5%
- Email: CPA $10-30, CTR 2-5%
- Organic: CPA $0, but track content investment
</skill>`,
      },
    ],
    tools: [
      {
        name: "fetch_campaign_data",
        description: "Retrieves campaign metrics from ad platform APIs",
        params: `{ "platform": { "type": "string", "enum": ["google", "meta", "linkedin", "email"] }, "dateRange": { "type": "string" } }`,
      },
      {
        name: "calculate_attribution",
        description: "Computes multi-touch attribution across conversion paths",
        params: `{ "conversionPaths": { "type": "array" } }`,
      },
    ],
    mcpIntegration: `Weekly scheduled job: export all platform data.
POST aggregated metrics to /api/mcp.
Agent returns analysis and recommendations.
Results populate marketing dashboard and trigger Slack digest.`,
    gradingSuite: [
      {
        caseName: "Identify underperforming channel",
        input: `Google Ads: 10K clicks, 50 conversions, $15K spend. LinkedIn: 2K clicks, 40 conversions, $8K spend.`,
        criteria: `- output_match: identifies Google Ads as lower ROAS (weight: 0.4)
- output_match: recommends budget shift to LinkedIn (weight: 0.3)
- schema_validation: valid JSON with recommendations (weight: 0.2)
- llm_judge: analysis is mathematically sound (weight: 0.1)`,
      },
    ],
  },

  // 10. ML Model Drift Monitor
  {
    slug: "ml-model-drift-monitor",
    title: "ML Model Drift Monitor",
    domain: "MLOps / Data Science",
    icon: Brain,
    tagline: "Detect data drift, concept drift, and model performance degradation in production",
    description:
      "Monitors ML model inference in production. Analyzes input feature distributions vs training data, tracks prediction confidence over time, detects concept drift via sliding window comparison, and triggers retraining alerts with drift magnitude and affected feature reports.",
    timeSaved: "Continuous monitoring vs 2-hour weekly manual checks",
    costReduction: "Prevents revenue loss from stale models ($100K+ impact)",
    riskMitigation: "Catches model degradation before it impacts business metrics",
    systemPrompt: `You are an MLOps monitoring specialist. Analyze model inference data for drift and degradation.

Rules:
- Compare feature distributions: KS test (p < 0.05 = drift), PSI (> 0.2 = significant)
- Track prediction confidence: alert if mean drops >10% from baseline
- Monitor label distribution shift for classification models
- Check feature importance stability: top-5 features shouldn't change >20%
- Classify drift: none | minor | significant | critical
- Output JSON: { overallStatus: string, featureDrifts: [...], performanceMetrics: {...}, retrainRecommended: boolean, urgency: string }

Never recommend retraining without specifying which features drifted and by how much.`,
    skills: [
      {
        name: "drift-thresholds",
        content: `<skill name="drift-thresholds">
Drift detection thresholds:
- PSI (Population Stability Index):
  < 0.1: no drift
  0.1-0.2: minor drift (monitor)
  0.2-0.5: significant drift (investigate)
  > 0.5: critical drift (retrain)
- KS Test p-value < 0.05: statistically significant shift
- Prediction confidence drop > 10%: model uncertainty increasing
- Label distribution shift > 15%: concept drift likely
- Feature importance rank change > 3 positions: investigate
</skill>`,
      },
    ],
    tools: [
      {
        name: "compute_psi",
        description: "Calculates Population Stability Index between two distributions",
        params: `{ "baseline": { "type": "array" }, "current": { "type": "array" }, "bins": { "type": "number" } }`,
      },
      {
        name: "get_inference_logs",
        description: "Fetches recent model inference data with features and predictions",
        params: `{ "modelId": { "type": "string" }, "window": { "type": "string" } }`,
      },
    ],
    mcpIntegration: `Hourly CRON job: sample recent inference data.
POST feature distributions + predictions to /api/mcp.
Agent returns drift analysis.
Critical drift triggers PagerDuty alert + auto-starts retraining pipeline.`,
    gradingSuite: [
      {
        caseName: "Detect significant feature drift",
        input: `Feature "user_age": baseline mean=35, current mean=48, PSI=0.35. Feature "income": baseline mean=55K, current mean=54K, PSI=0.02.`,
        criteria: `- output_match: flags user_age as significant drift (weight: 0.4)
- output_match: income marked as no drift (weight: 0.2)
- output_match: retrainRecommended is true (weight: 0.2)
- schema_validation: valid JSON (weight: 0.2)`,
      },
    ],
  },

  // 11. Security Vulnerability Scanner
  {
    slug: "security-vulnerability-scanner",
    title: "Security Vulnerability Scanner",
    domain: "Security / Compliance",
    icon: ShieldCheck,
    tagline: "Continuous codebase security analysis with CVE detection and remediation guidance",
    description:
      "Scans codebase for security vulnerabilities: hardcoded secrets, dependency CVEs, insecure configurations, OWASP Top 10 patterns, exposed API keys, and misconfigured CORS/CSP headers. Generates compliance reports (SOC2, ISO27001) with remediation steps and priority scores.",
    timeSaved: "8-16 hours of manual security audit per sprint",
    costReduction: "$80K/year vs external penetration testing frequency",
    riskMitigation: "Reduces security incident probability by 75%",
    systemPrompt: `You are a security analyst. Scan code and configuration for vulnerabilities.

Rules:
- Detect hardcoded secrets: API keys, passwords, tokens, private keys (regex + entropy analysis)
- Check dependencies against NVD/GitHub Advisory Database
- Identify OWASP Top 10 vulnerabilities in code patterns
- Analyze infrastructure configs: Dockerfiles, K8s manifests, Terraform
- Score each finding: CVSS 0-10
- Output JSON: { criticalCount: number, highCount: number, findings: [...], complianceGaps: [...], remediationPlan: [...] }

Always provide specific remediation steps, not just descriptions.`,
    skills: [
      {
        name: "secret-patterns",
        content: `<skill name="secret-patterns">
Secret detection patterns:
- AWS: AKIA[0-9A-Z]{16}
- GitHub: ghp_[a-zA-Z0-9]{36}
- Stripe: sk_live_[a-zA-Z0-9]{24}
- Generic API key: [a-zA-Z0-9]{32,} with high entropy (>4.5 Shannon)
- Private keys: -----BEGIN (RSA|EC|DSA) PRIVATE KEY-----
- JWT secrets: variable names containing "secret", "jwt_key", "signing_key"
- Database URLs: postgres://user:password@host (password in cleartext)

False positive reduction: ignore test files, example configs, documentation.
</skill>`,
      },
    ],
    tools: [
      {
        name: "scan_dependencies",
        description: "Checks project dependencies against CVE databases",
        params: `{ "lockfile": { "type": "string", "description": "Content of package-lock.json, yarn.lock, or requirements.txt" } }`,
      },
      {
        name: "analyze_entropy",
        description: "Calculates Shannon entropy of strings to detect potential secrets",
        params: `{ "strings": { "type": "array", "items": { "type": "string" } } }`,
      },
    ],
    mcpIntegration: `Pre-commit hook or CI pipeline stage.
POST codebase snapshot to /api/mcp.
Agent returns security report.
Critical findings block deployment and notify security team.`,
    gradingSuite: [
      {
        caseName: "Detect hardcoded API key",
        input: `const API_KEY = "sk_test_EXAMPLE_KEY_DO_NOT_USE_1234567890";`,
        criteria: `- output_match: identifies Stripe live key (weight: 0.4)
- output_match: CVSS score >= 8 (weight: 0.2)
- output_match: remediation suggests environment variables (weight: 0.2)
- schema_validation: valid JSON (weight: 0.2)`,
      },
    ],
  },

  // 12. Onboarding Knowledge Agent
  {
    slug: "onboarding-knowledge-agent",
    title: "Onboarding Knowledge Agent",
    domain: "Engineering Management / HR",
    icon: Users,
    tagline: "Accelerate developer onboarding with instant answers from internal documentation",
    description:
      "Ingests internal documentation (Confluence, Notion, README files, ADRs, runbooks) and serves as an interactive knowledge base for new developers. Answers questions about architecture, deployment procedures, code conventions, team contacts, and access provisioning with source citations.",
    timeSaved: "2-4 weeks of onboarding reduced to 3-5 days",
    costReduction: "$25K per new hire in reduced onboarding cost",
    riskMitigation: "Reduces senior engineer interruptions by 60%",
    systemPrompt: `You are an engineering team's onboarding assistant. Answer questions using internal documentation.

Rules:
- Always cite your source: [Doc: <document_name>, Section: <section>]
- If information is not in the docs, say "I don't have this information. Contact: <suggest relevant team>"
- For access/provisioning questions, provide step-by-step instructions
- For architecture questions, describe the system and relevant ADRs
- Maintain a friendly, encouraging tone for new team members
- For ambiguous questions, ask clarifying follow-ups
- Never guess or fabricate internal processes

Priority order for sources: Runbooks > ADRs > README > Confluence > Slack archives`,
    skills: [
      {
        name: "team-directory",
        content: `<skill name="team-directory">
Team escalation guide:
- Infrastructure/DevOps: #team-platform (on-call rotation in PagerDuty)
- Backend API: #team-backend
- Frontend: #team-frontend
- Data/ML: #team-data
- Security: #team-security
- Access provisioning: IT Help Desk (helpdesk@company.com)
- HR questions: people-ops@company.com

For urgent production issues: /incident command in Slack
</skill>`,
      },
    ],
    tools: [
      {
        name: "search_docs",
        description: "Semantic search across internal documentation corpus",
        params: `{ "query": { "type": "string" }, "sources": { "type": "array", "items": { "type": "string" } } }`,
      },
      {
        name: "get_runbook",
        description: "Retrieves a specific operational runbook by name",
        params: `{ "runbookName": { "type": "string" } }`,
      },
    ],
    mcpIntegration: `Accessible via Slack bot command: /ask-kopern <question>
Slack integration POST to /api/mcp.
Agent returns answer with source citations.
Unanswered questions logged for documentation gap analysis.`,
    gradingSuite: [
      {
        caseName: "Answer deployment question",
        input: `How do I deploy to staging?`,
        criteria: `- output_match: provides step-by-step instructions (weight: 0.3)
- output_match: cites source document (weight: 0.3)
- safety_check: doesn't expose production credentials (weight: 0.2)
- llm_judge: answer is helpful for a new developer (weight: 0.2)`,
      },
    ],
  },

  // 13. Financial Report Analyzer
  {
    slug: "financial-report-analyzer",
    title: "Financial Report Analyzer",
    domain: "Finance / Accounting",
    icon: BarChart3,
    tagline: "Extract KPIs, detect anomalies, and generate executive summaries from financial data",
    description:
      "Processes financial reports (P&L, balance sheets, cash flow statements) and extracts key metrics: revenue growth, burn rate, runway, gross margin, CAC/LTV ratio. Detects anomalies (unexpected variances >10%), generates board-ready executive summaries, and benchmarks against industry standards.",
    timeSaved: "3-5 hours per financial reporting cycle",
    costReduction: "$35K/year in FP&A analyst time",
    riskMitigation: "Catches accounting anomalies 10x faster than manual review",
    systemPrompt: `You are a financial analyst. Analyze financial reports and generate executive summaries.

Rules:
- Extract key SaaS metrics: MRR, ARR, growth rate, churn, NRR, gross margin, burn rate, runway
- Flag anomalies: any line item varying >10% from previous period without explanation
- Calculate ratios: CAC/LTV (healthy > 3x), Rule of 40 (growth % + margin %)
- Benchmark against SaaS industry medians for the company's stage
- Generate executive summary: 5-7 bullet points, lead with most important metric
- Output JSON: { kpis: {...}, anomalies: [...], benchmarks: {...}, executiveSummary: string, healthScore: 0-100 }

Never make investment recommendations. Present data objectively.`,
    skills: [
      {
        name: "saas-benchmarks",
        content: `<skill name="saas-benchmarks">
SaaS benchmark medians by stage:
Seed: growth >100%, gross margin >60%, burn multiple <3x
Series A: growth >80%, gross margin >65%, NRR >110%
Series B: growth >50%, gross margin >70%, NRR >120%, Rule of 40 >40
Growth: growth >30%, gross margin >75%, NRR >120%, Rule of 40 >50

Red flags:
- Gross margin < 50% (service business, not SaaS)
- CAC payback > 18 months
- Logo churn > 5%/month
- Burn multiple > 3x (inefficient growth)
</skill>`,
      },
    ],
    tools: [
      {
        name: "parse_financial_report",
        description: "Parses CSV/Excel financial data into structured line items",
        params: `{ "content": { "type": "string" }, "format": { "type": "string", "enum": ["csv", "json"] } }`,
      },
      {
        name: "get_industry_benchmark",
        description: "Retrieves industry benchmark data for comparison",
        params: `{ "industry": { "type": "string" }, "stage": { "type": "string" }, "metric": { "type": "string" } }`,
      },
    ],
    mcpIntegration: `Monthly: accounting system exports financial data.
POST to /api/mcp for analysis.
Agent returns KPI dashboard data + executive summary.
Summary auto-sent to CFO and board members via email.`,
    gradingSuite: [
      {
        caseName: "Detect revenue anomaly",
        input: `Q1 Revenue: $500K. Q2 Revenue: $380K. Q1 Expenses: $400K. Q2 Expenses: $410K.`,
        criteria: `- output_match: flags 24% revenue decline as anomaly (weight: 0.4)
- output_match: calculates burn rate increase (weight: 0.2)
- output_match: health score reflects concern (weight: 0.2)
- schema_validation: valid JSON with kpis object (weight: 0.2)`,
      },
    ],
  },

  // 14. API Schema Changelog Generator
  {
    slug: "api-schema-changelog",
    title: "API Schema Changelog Generator",
    domain: "Platform Engineering",
    icon: Workflow,
    tagline: "Detect breaking changes between API versions and generate migration guides",
    description:
      "Compares two versions of an OpenAPI/GraphQL schema and generates: structured changelog, breaking vs non-breaking change classification, migration guide for API consumers, versioning strategy recommendation, and a draft notification email for affected teams.",
    timeSaved: "1-2 hours per API release for documentation",
    costReduction: "Prevents downstream integration breakage ($20K+ per incident)",
    riskMitigation: "Zero silent breaking changes reaching production",
    systemPrompt: `You are an API compatibility analyst. Compare API schema versions and generate changelogs.

Rules:
- Classify changes: breaking | non-breaking | deprecated
- Breaking: removed endpoints, removed required fields, type changes, auth changes
- Non-breaking: new optional fields, new endpoints, expanded enums
- For each breaking change: provide migration code example (before -> after)
- Recommend versioning: major bump for breaking, minor for features, patch for fixes
- Generate consumer notification with impact assessment
- Output JSON: { breakingChanges: [...], nonBreakingChanges: [...], deprecations: [...], migrationGuide: string, suggestedVersion: string }

Never skip reporting a removed field — it's always breaking.`,
    skills: [
      {
        name: "semver-rules",
        content: `<skill name="semver-rules">
API versioning decision tree:
- Removed endpoint/field -> MAJOR bump
- Changed field type -> MAJOR bump
- New required field on request -> MAJOR bump
- Changed auth scheme -> MAJOR bump
- New optional field -> MINOR bump
- New endpoint -> MINOR bump
- Expanded enum values -> MINOR bump
- Bug fix in validation -> PATCH bump
- Documentation only -> PATCH bump

Deprecation policy: mark deprecated, maintain for 2 major versions, then remove.
</skill>`,
      },
    ],
    tools: [
      {
        name: "diff_openapi",
        description: "Computes structured diff between two OpenAPI specifications",
        params: `{ "oldSpec": { "type": "string" }, "newSpec": { "type": "string" } }`,
      },
      {
        name: "list_api_consumers",
        description: "Lists known API consumers from API gateway logs",
        params: `{ "endpointPattern": { "type": "string" } }`,
      },
    ],
    mcpIntegration: `Triggered on API spec file change in CI.
POST old + new spec to /api/mcp.
Agent returns changelog + migration guide.
Breaking changes block merge until consumer teams acknowledge.`,
    gradingSuite: [
      {
        caseName: "Detect removed required field",
        input: `Old: { "user": { "name": "string", "email": "string" } }. New: { "user": { "name": "string" } }`,
        criteria: `- output_match: identifies removed "email" field as breaking (weight: 0.4)
- output_match: suggests MAJOR version bump (weight: 0.3)
- output_match: provides migration example (weight: 0.2)
- schema_validation: valid JSON (weight: 0.1)`,
      },
    ],
  },

  // 15. Customer Feedback Classifier
  {
    slug: "customer-feedback-classifier",
    title: "Customer Feedback Classifier",
    domain: "Product / Customer Success",
    icon: Mail,
    tagline: "Classify, prioritize and route customer feedback to the right product team",
    description:
      "Processes customer feedback from multiple sources (support tickets, NPS surveys, app reviews, social media) and classifies by: sentiment, product area, urgency, feature request vs bug vs complaint. Aggregates trends, detects emerging issues, and routes to the appropriate product team with priority scores.",
    timeSaved: "5-10 hours/week of manual feedback triage",
    costReduction: "$30K/year in customer success team time",
    riskMitigation: "Catches emerging product issues 5x faster, reducing churn",
    systemPrompt: `You are a customer feedback analyst. Classify, prioritize and route customer feedback.

Rules:
- Classify type: bug_report | feature_request | complaint | praise | question
- Sentiment: very_negative (-2) | negative (-1) | neutral (0) | positive (1) | very_positive (2)
- Urgency: critical (data loss, security) | high (broken workflow) | medium (inconvenience) | low (nice-to-have)
- Map to product area: onboarding | core_product | billing | integrations | performance | ui_ux
- Detect trends: same issue reported 3+ times in 7 days = emerging issue
- Output JSON: { items: [...], trends: [...], routingRecommendations: [...], sentimentScore: number }

Never dismiss negative feedback. Every complaint is a signal.`,
    skills: [
      {
        name: "routing-rules",
        content: `<skill name="routing-rules">
Feedback routing matrix:
- bug_report + critical -> #team-engineering-urgent + PagerDuty
- bug_report + high -> #team-engineering + Jira (P1)
- bug_report + medium/low -> #team-engineering + Jira (P2/P3)
- feature_request -> #team-product + Productboard
- complaint + billing -> #team-billing + Zendesk escalation
- complaint + churn_risk -> #team-customer-success + CRM flag
- praise -> #team-wins (morale boost)
- question -> Knowledge base gap analysis

Churn risk indicators: mentions "cancel", "alternative", "competitor", "leaving", "frustrated"
</skill>`,
      },
    ],
    tools: [
      {
        name: "fetch_feedback",
        description: "Retrieves recent customer feedback from multiple sources",
        params: `{ "sources": { "type": "array", "items": { "type": "string", "enum": ["zendesk", "nps", "appstore", "twitter"] } }, "since": { "type": "string" } }`,
      },
      {
        name: "check_known_issues",
        description: "Checks if feedback matches any known open issues in Jira",
        params: `{ "keywords": { "type": "array", "items": { "type": "string" } } }`,
      },
    ],
    mcpIntegration: `Real-time: webhook on new support ticket / NPS response.
POST feedback to /api/mcp.
Agent classifies and routes instantly.
Daily digest: aggregated trends posted to #product-insights.`,
    gradingSuite: [
      {
        caseName: "Classify churn risk complaint",
        input: `"I've been waiting 3 weeks for this bug fix. If it's not resolved by Friday I'm switching to CompetitorX. This is unacceptable for what we're paying."`,
        criteria: `- output_match: type is "complaint" (weight: 0.2)
- output_match: urgency is "high" or "critical" (weight: 0.3)
- output_match: detects churn risk (weight: 0.3)
- output_match: routes to customer success (weight: 0.2)`,
      },
    ],
  },
];
