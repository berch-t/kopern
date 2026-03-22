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
  Network,
  Sparkles,
  Eye,
  GitMerge,
  Layers,
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
  tools: { name: string; description: string; params: string; executeCode?: string }[];
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
        executeCode: "const lines = args.diff.split('\\n');\nconst files = [];\nlet currentFile = null;\nlet hunk = null;\nfor (const line of lines) {\n  if (line.startsWith('diff --git') || line.startsWith('--- ') && lines[lines.indexOf(line)+1]?.startsWith('+++ ')) continue;\n  if (line.startsWith('--- ')) { if (!currentFile) currentFile = { oldFile: line.slice(4), newFile: '', hunks: [], additions: 0, deletions: 0 }; else currentFile.oldFile = line.slice(4); continue; }\n  if (line.startsWith('+++ ')) { if (!currentFile) currentFile = { oldFile: '', newFile: line.slice(4), hunks: [], additions: 0, deletions: 0 }; else currentFile.newFile = line.slice(4); continue; }\n  if (line.startsWith('@@')) {\n    const match = line.match(/@@ -(\\d+),?(\\d*) \\+(\\d+),?(\\d*) @@(.*)/);\n    if (match) {\n      if (!currentFile) currentFile = { oldFile: 'unknown', newFile: 'unknown', hunks: [], additions: 0, deletions: 0 };\n      hunk = { oldStart: parseInt(match[1]), oldLines: parseInt(match[2] || '1'), newStart: parseInt(match[3]), newLines: parseInt(match[4] || '1'), header: match[5].trim(), changes: [] };\n      currentFile.hunks.push(hunk);\n    }\n    continue;\n  }\n  if (hunk) {\n    if (line.startsWith('+')) { hunk.changes.push({ type: 'add', content: line.slice(1) }); if (currentFile) currentFile.additions++; }\n    else if (line.startsWith('-')) { hunk.changes.push({ type: 'delete', content: line.slice(1) }); if (currentFile) currentFile.deletions++; }\n    else { hunk.changes.push({ type: 'context', content: line.startsWith(' ') ? line.slice(1) : line }); }\n  }\n  if (line === '' && currentFile && !hunk) { files.push(currentFile); currentFile = null; }\n}\nif (currentFile) files.push(currentFile);\nconst totalAdds = files.reduce((s, f) => s + f.additions, 0);\nconst totalDels = files.reduce((s, f) => s + f.deletions, 0);\nresult = JSON.stringify({ filesChanged: files.length, totalAdditions: totalAdds, totalDeletions: totalDels, files });",
      },
      {
        name: "check_dependencies",
        description: "Checks package versions against known CVE databases",
        params: `{ "packages": { "type": "array", "items": { "type": "string" }, "description": "Package names with versions" } }`,
        executeCode: "const knownVulns = {\n  'lodash': [{ below: '4.17.21', cve: 'CVE-2021-23337', severity: 'high', title: 'Command Injection' }],\n  'minimist': [{ below: '1.2.6', cve: 'CVE-2021-44906', severity: 'critical', title: 'Prototype Pollution' }],\n  'node-fetch': [{ below: '2.6.7', cve: 'CVE-2022-0235', severity: 'high', title: 'Information Exposure' }],\n  'json5': [{ below: '2.2.2', cve: 'CVE-2022-46175', severity: 'high', title: 'Prototype Pollution' }],\n  'semver': [{ below: '7.5.2', cve: 'CVE-2022-25883', severity: 'medium', title: 'ReDoS' }],\n  'axios': [{ below: '1.6.0', cve: 'CVE-2023-45857', severity: 'medium', title: 'CSRF Token Exposure' }],\n  'express': [{ below: '4.18.2', cve: 'CVE-2022-24999', severity: 'high', title: 'Open Redirect' }],\n  'jsonwebtoken': [{ below: '9.0.0', cve: 'CVE-2022-23529', severity: 'critical', title: 'Arbitrary Code Execution' }],\n  'tar': [{ below: '6.1.9', cve: 'CVE-2021-37713', severity: 'high', title: 'Arbitrary File Creation' }],\n  'qs': [{ below: '6.10.3', cve: 'CVE-2022-24999', severity: 'high', title: 'Prototype Pollution' }]\n};\nconst results = [];\nfor (const pkg of args.packages) {\n  const match = pkg.match(/^(@?[^@]+)@?(.*)$/);\n  const name = match ? match[1] : pkg;\n  const version = match && match[2] ? match[2] : 'unknown';\n  const vulns = knownVulns[name] || [];\n  const applicable = version !== 'unknown' ? vulns.filter(v => {\n    const parts = version.replace(/^[^\\d]*/, '').split('.').map(Number);\n    const belowParts = v.below.split('.').map(Number);\n    for (let i = 0; i < 3; i++) { if ((parts[i]||0) < (belowParts[i]||0)) return true; if ((parts[i]||0) > (belowParts[i]||0)) return false; }\n    return false;\n  }) : vulns;\n  results.push({ package: name, version, vulnerabilities: applicable, status: applicable.length > 0 ? 'vulnerable' : 'ok' });\n}\nconst vulnCount = results.filter(r => r.status === 'vulnerable').length;\nresult = JSON.stringify({ total: results.length, vulnerable: vulnCount, clean: results.length - vulnCount, results });",
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
        executeCode: "const table = args.tableName;\nconst connStr = args.connectionString || '';\nconst dbMatch = connStr.match(/\\/([^/?]+)(\\?|$)/);\nconst dbName = dbMatch ? dbMatch[1] : 'unknown';\nresult = JSON.stringify({\n  status: 'estimate_generated',\n  table: table,\n  database: dbName,\n  note: 'Cannot connect to database from sandbox. Provide actual row count and avg row size for accurate estimates.',\n  instruction: 'To get real data, run these queries and provide results: SELECT COUNT(*) FROM ' + table + '; SELECT pg_total_relation_size(\\'' + table + '\\') as total_bytes;',\n  estimationFormula: {\n    description: 'Provide rowCount and avgRowSizeBytes to calculate',\n    formula: 'totalSizeBytes = rowCount * avgRowSizeBytes * 1.2 (20% overhead for indexes)',\n    example: { rowCount: 1000000, avgRowSizeBytes: 256, estimatedSizeMB: (1000000 * 256 * 1.2) / (1024*1024) }\n  }\n});",
      },
      {
        name: "validate_sql",
        description: "Validates SQL syntax and returns parsed AST",
        params: `{ "sql": { "type": "string", "description": "SQL statement to validate" } }`,
        executeCode: "const sql = args.sql.trim();\nconst errors = [];\nconst warnings = [];\nconst upper = sql.toUpperCase();\nconst stmtType = upper.startsWith('SELECT') ? 'SELECT' : upper.startsWith('INSERT') ? 'INSERT' : upper.startsWith('UPDATE') ? 'UPDATE' : upper.startsWith('DELETE') ? 'DELETE' : upper.startsWith('CREATE') ? 'CREATE' : upper.startsWith('ALTER') ? 'ALTER' : upper.startsWith('DROP') ? 'DROP' : 'UNKNOWN';\nlet parens = 0;\nfor (const ch of sql) { if (ch === '(') parens++; if (ch === ')') parens--; if (parens < 0) { errors.push('Unmatched closing parenthesis'); break; } }\nif (parens > 0) errors.push('Unclosed parenthesis: ' + parens + ' opening paren(s) without match');\nconst quotes = (sql.match(/'/g) || []).length;\nif (quotes % 2 !== 0) errors.push('Unmatched single quote');\nconst dquotes = (sql.match(/\"/g) || []).length;\nif (dquotes % 2 !== 0) errors.push('Unmatched double quote');\nif (!sql.endsWith(';') && !sql.endsWith(')')) warnings.push('Statement does not end with semicolon');\nif (stmtType === 'SELECT' && !upper.includes('FROM') && !upper.includes('DUAL')) warnings.push('SELECT without FROM clause');\nif (stmtType === 'DELETE' && !upper.includes('WHERE')) warnings.push('DELETE without WHERE clause - will delete all rows');\nif (stmtType === 'UPDATE' && !upper.includes('WHERE')) warnings.push('UPDATE without WHERE clause - will update all rows');\nif (upper.includes('SELECT *')) warnings.push('SELECT * used - consider specifying columns');\nif (stmtType === 'DROP') warnings.push('DROP statement detected - destructive operation');\nconst tables = [];\nconst fromMatch = upper.match(/FROM\\s+([\\w.,\\s]+?)(?:WHERE|JOIN|ORDER|GROUP|HAVING|LIMIT|UNION|$)/s);\nif (fromMatch) fromMatch[1].split(',').forEach(t => tables.push(t.trim().split(/\\s+/)[0]));\nconst joinMatches = upper.match(/JOIN\\s+(\\w+)/g);\nif (joinMatches) joinMatches.forEach(j => tables.push(j.replace(/JOIN\\s+/i, '')));\nconst cols = [];\nif (stmtType === 'SELECT') {\n  const selMatch = sql.match(/SELECT\\s+(.+?)\\s+FROM/is);\n  if (selMatch && selMatch[1].trim() !== '*') selMatch[1].split(',').forEach(c => cols.push(c.trim()));\n}\nresult = JSON.stringify({ valid: errors.length === 0, statementType: stmtType, errors, warnings, tables: [...new Set(tables)], columns: cols });",
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
        executeCode: "const runId = args.runId;\nconst provider = args.provider;\nconst urls = {\n  github: 'https://api.github.com/repos/{owner}/{repo}/actions/runs/' + runId + '/logs',\n  gitlab: 'https://gitlab.com/api/v4/projects/{id}/jobs/' + runId + '/trace',\n  jenkins: 'https://{host}/job/{name}/' + runId + '/consoleText'\n};\nresult = JSON.stringify({\n  status: 'external_data_required',\n  runId: runId,\n  provider: provider,\n  instruction: 'This tool requires external API access. Please provide the log content directly as a parameter, or use the appropriate CI/CD API.',\n  apiEndpoint: urls[provider] || 'unknown',\n  requiredAuth: provider === 'github' ? 'Bearer token with actions:read scope' : provider === 'gitlab' ? 'Private-Token header' : 'Basic auth or API token',\n  tip: 'If you have the log content, pass it to parse_alert_timeline or provide it directly for analysis.'\n});",
      },
      {
        name: "get_recent_runs",
        description: "Gets status of recent pipeline runs for flaky test detection",
        params: `{ "branch": { "type": "string" }, "limit": { "type": "number" } }`,
        executeCode: "const branch = args.branch || 'main';\nconst limit = args.limit || 10;\nresult = JSON.stringify({\n  status: 'external_data_required',\n  branch: branch,\n  limit: limit,\n  instruction: 'Provide pipeline run data as an array of objects with fields: {id, status, branch, startedAt, finishedAt, duration, failedTests}',\n  analysisCapabilities: [\n    'Flaky test detection (tests that fail intermittently)',\n    'Failure rate calculation per test',\n    'Duration trend analysis',\n    'Success/failure ratio over time'\n  ],\n  sampleInput: [\n    { id: 'run-1', status: 'success', branch: branch, startedAt: '2024-01-01T10:00:00Z', duration: 180, failedTests: [] },\n    { id: 'run-2', status: 'failed', branch: branch, startedAt: '2024-01-02T10:00:00Z', duration: 95, failedTests: ['test_auth_login', 'test_payment_flow'] }\n  ]\n});",
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
        executeCode: "const lines = args.csvContent.trim().split('\\n');\nconst provider = args.provider;\nif (lines.length < 2) { result = JSON.stringify({ error: 'CSV must have at least a header row and one data row' }); }\nelse {\n  const headers = lines[0].split(',').map(h => h.trim().replace(/^\"|\"$/g, ''));\n  const rows = [];\n  for (let i = 1; i < lines.length; i++) {\n    const vals = [];\n    let inQuote = false; let cur = '';\n    for (const ch of lines[i]) {\n      if (ch === '\"') { inQuote = !inQuote; continue; }\n      if (ch === ',' && !inQuote) { vals.push(cur.trim()); cur = ''; continue; }\n      cur += ch;\n    }\n    vals.push(cur.trim());\n    const row = {};\n    headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });\n    rows.push(row);\n  }\n  const costField = headers.find(h => /cost|amount|charge|price|total/i.test(h)) || null;\n  const serviceField = headers.find(h => /service|product|resource|sku|description/i.test(h)) || null;\n  let totalCost = 0;\n  const byService = {};\n  for (const row of rows) {\n    const cost = costField ? parseFloat(row[costField]) || 0 : 0;\n    totalCost += cost;\n    if (serviceField) {\n      const svc = row[serviceField] || 'unknown';\n      byService[svc] = (byService[svc] || 0) + cost;\n    }\n  }\n  const topServices = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, cost]) => ({ name, cost: Math.round(cost * 100) / 100, percentage: Math.round(cost / totalCost * 10000) / 100 }));\n  result = JSON.stringify({ provider, rowCount: rows.length, headers, totalCost: Math.round(totalCost * 100) / 100, costField, serviceField, topServices, sampleRows: rows.slice(0, 3) });\n}",
      },
      {
        name: "get_utilization_metrics",
        description: "Fetches CPU/memory/network utilization for a resource",
        params: `{ "resourceId": { "type": "string" }, "period": { "type": "string" } }`,
        executeCode: "const resourceId = args.resourceId;\nconst period = args.period || '1h';\nresult = JSON.stringify({\n  status: 'external_data_required',\n  resourceId: resourceId,\n  period: period,\n  instruction: 'Provide utilization data as an object with cpu, memory, network, and disk arrays. Each array should contain {timestamp, value} objects.',\n  analysisCapabilities: [\n    'Peak/average/p95 calculation',\n    'Anomaly detection via standard deviation',\n    'Trend analysis (increasing/decreasing/stable)',\n    'Right-sizing recommendations'\n  ],\n  sampleInput: {\n    cpu: [{ timestamp: '2024-01-01T10:00:00Z', value: 45.2 }, { timestamp: '2024-01-01T10:05:00Z', value: 72.1 }],\n    memory: [{ timestamp: '2024-01-01T10:00:00Z', value: 68.0 }],\n    network: [{ timestamp: '2024-01-01T10:00:00Z', value: 125.5 }]\n  }\n});",
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
        executeCode: "const alerts = args.alerts || [];\nconst events = [];\nfor (const alert of alerts) {\n  const id = alert.id || alert.alertId || alert.incident_id || ('alert-' + events.length);\n  const title = alert.title || alert.summary || alert.message || alert.description || 'Untitled alert';\n  const severity = (alert.severity || alert.priority || alert.urgency || 'unknown').toString().toLowerCase();\n  const status = (alert.status || alert.state || 'unknown').toString().toLowerCase();\n  const createdAt = alert.created_at || alert.createdAt || alert.timestamp || alert.started_at || null;\n  const resolvedAt = alert.resolved_at || alert.resolvedAt || alert.ended_at || null;\n  const service = alert.service || alert.source || alert.integration || 'unknown';\n  let durationMin = null;\n  if (createdAt && resolvedAt) {\n    durationMin = Math.round((new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / 60000);\n  }\n  events.push({ id, title, severity, status, service, createdAt, resolvedAt, durationMinutes: durationMin, raw: alert });\n}\nevents.sort((a, b) => {\n  if (!a.createdAt) return 1; if (!b.createdAt) return -1;\n  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();\n});\nconst bySeverity = {}; const byService = {}; const byStatus = {};\nfor (const e of events) {\n  bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;\n  byService[e.service] = (byService[e.service] || 0) + 1;\n  byStatus[e.status] = (byStatus[e.status] || 0) + 1;\n}\nconst resolved = events.filter(e => e.durationMinutes !== null);\nconst avgMTTR = resolved.length > 0 ? Math.round(resolved.reduce((s, e) => s + e.durationMinutes, 0) / resolved.length) : null;\nresult = JSON.stringify({ totalAlerts: events.length, bySeverity, byService, byStatus, avgMTTRMinutes: avgMTTR, timeline: events });",
      },
      {
        name: "estimate_revenue_impact",
        description: "Estimates revenue lost based on downtime duration and traffic patterns",
        params: `{ "durationMinutes": { "type": "number" }, "avgRevenuePerMinute": { "type": "number" } }`,
        executeCode: "const dur = args.durationMinutes || 0;\nconst rpm = args.avgRevenuePerMinute || 0;\nconst directLoss = Math.round(dur * rpm * 100) / 100;\nconst recoveryFactor = dur <= 5 ? 1.0 : dur <= 30 ? 1.15 : dur <= 60 ? 1.3 : dur <= 240 ? 1.5 : 2.0;\nconst totalEstimate = Math.round(directLoss * recoveryFactor * 100) / 100;\nconst hourlyRate = Math.round(rpm * 60 * 100) / 100;\nconst dailyRate = Math.round(rpm * 1440 * 100) / 100;\nconst category = dur <= 5 ? 'minor' : dur <= 30 ? 'moderate' : dur <= 120 ? 'significant' : dur <= 480 ? 'severe' : 'critical';\nresult = JSON.stringify({\n  durationMinutes: dur,\n  avgRevenuePerMinute: rpm,\n  directRevenueLoss: directLoss,\n  recoveryTimeFactor: recoveryFactor,\n  recoveryFactorExplanation: 'Longer outages have lingering effects: customer churn, abandoned carts, trust erosion',\n  estimatedTotalImpact: totalEstimate,\n  impactCategory: category,\n  context: { hourlyRevenue: hourlyRate, dailyRevenue: dailyRate },\n  recommendations: dur > 60 ? [\n    'Consider customer communication / status page update',\n    'Plan post-incident credits or goodwill gestures',\n    'Schedule post-mortem within 48 hours'\n  ] : ['Monitor for cascading effects after recovery']\n});",
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
        executeCode: "const channelId = args.channelId;\nconst date = args.date;\nresult = JSON.stringify({\n  status: 'external_data_required',\n  channelId: channelId,\n  date: date,\n  instruction: 'This tool requires Slack API access. Provide message data directly as an array of {user, text, timestamp, thread_ts?, reactions?} objects.',\n  slackApiCall: {\n    method: 'conversations.history',\n    params: { channel: channelId, oldest: new Date(date + 'T00:00:00Z').getTime() / 1000, latest: new Date(date + 'T23:59:59Z').getTime() / 1000 },\n    requiredScopes: ['channels:history', 'groups:history']\n  }\n});",
      },
      {
        name: "get_previous_standups",
        description: "Retrieves historical standups for stale item detection",
        params: `{ "userId": { "type": "string" }, "days": { "type": "number" } }`,
        executeCode: "const userId = args.userId;\nconst days = args.days || 7;\nresult = JSON.stringify({\n  status: 'external_data_required',\n  userId: userId,\n  days: days,\n  instruction: 'Provide standup data as an array of {date, items: [{text, status, category}]} objects. Status: done/in_progress/blocked. Category: feature/bugfix/review/meeting/other.',\n  analysisCapabilities: [\n    'Stale item detection (in_progress > 3 days)',\n    'Blocked item tracking',\n    'Velocity trends',\n    'Category distribution'\n  ],\n  dateRange: { from: new Date(Date.now() - days * 86400000).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] }\n});",
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
        executeCode: "const doc = args.document || '';\nconst clauses = [];\nconst patterns = [\n  /(?:^|\\n)\\s*(\\d+\\.\\d*\\.?\\d*\\.?)\\s+(.+?)(?=\\n\\s*\\d+\\.\\d*|\\n\\n|$)/gs,\n  /(?:^|\\n)\\s*(Section\\s+\\d+[:\\.]?)\\s*(.+?)(?=\\nSection\\s+\\d+|\\n\\n|$)/gis,\n  /(?:^|\\n)\\s*(Article\\s+\\d+[:\\.]?)\\s*(.+?)(?=\\nArticle\\s+\\d+|\\n\\n|$)/gis,\n  /(?:^|\\n)\\s*([IVXLC]+\\.\\s*)(.+?)(?=\\n[IVXLC]+\\.|\\n\\n|$)/gs\n];\nlet matched = false;\nfor (const pattern of patterns) {\n  let m;\n  while ((m = pattern.exec(doc)) !== null) {\n    matched = true;\n    const num = m[1].trim();\n    const text = m[2].trim();\n    const category = /indemnif|liabil|limitation/i.test(text) ? 'liability' : /terminat|cancel/i.test(text) ? 'termination' : /confidential|nda|non-disclos/i.test(text) ? 'confidentiality' : /payment|fee|price|invoice/i.test(text) ? 'payment' : /govern.*law|jurisdict|arbitrat/i.test(text) ? 'governing_law' : /warrant|represent/i.test(text) ? 'warranty' : /intellect.*prop|ip |copyright|patent/i.test(text) ? 'ip' : /force.*majeure/i.test(text) ? 'force_majeure' : 'general';\n    clauses.push({ number: num, text, category, charCount: text.length });\n  }\n  if (matched) break;\n}\nif (!matched) {\n  const paragraphs = doc.split(/\\n\\n+/).filter(p => p.trim().length > 20);\n  paragraphs.forEach((p, i) => clauses.push({ number: String(i + 1), text: p.trim(), category: 'general', charCount: p.trim().length }));\n}\nconst categories = {};\nclauses.forEach(c => { categories[c.category] = (categories[c.category] || 0) + 1; });\nresult = JSON.stringify({ totalClauses: clauses.length, categories, clauses });",
      },
      {
        name: "compare_template",
        description: "Compares clauses against company standard contract template",
        params: `{ "clauses": { "type": "array" }, "templateId": { "type": "string" } }`,
        executeCode: "const clauses = args.clauses || [];\nconst templateId = args.templateId || 'standard';\nconst requiredCategories = ['liability', 'termination', 'confidentiality', 'payment', 'governing_law', 'warranty', 'ip'];\nconst findings = [];\nconst presentCategories = new Set(clauses.map(c => c.category).filter(Boolean));\nfor (const cat of requiredCategories) {\n  if (!presentCategories.has(cat)) {\n    findings.push({ type: 'missing_clause', category: cat, severity: 'high', message: 'Required ' + cat + ' clause is missing from the contract' });\n  }\n}\nconst riskKeywords = {\n  'unlimited liability': { severity: 'critical', message: 'Unlimited liability exposure detected' },\n  'auto-renew': { severity: 'medium', message: 'Auto-renewal clause found - verify terms' },\n  'non-compete': { severity: 'high', message: 'Non-compete clause found - verify scope and duration' },\n  'exclusive': { severity: 'medium', message: 'Exclusivity clause found' },\n  'perpetual': { severity: 'high', message: 'Perpetual license/term found' },\n  'waive': { severity: 'high', message: 'Waiver clause detected - review carefully' },\n  'sole discretion': { severity: 'medium', message: 'Sole discretion language found - one-sided term' }\n};\nfor (const clause of clauses) {\n  const lower = (clause.text || '').toLowerCase();\n  for (const [keyword, info] of Object.entries(riskKeywords)) {\n    if (lower.includes(keyword)) {\n      findings.push({ type: 'risk_flag', clause: clause.number, category: clause.category, keyword, severity: info.severity, message: info.message });\n    }\n  }\n}\nconst bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };\nfindings.forEach(f => { bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1; });\nconst riskScore = bySeverity.critical * 25 + bySeverity.high * 10 + bySeverity.medium * 3 + bySeverity.low * 1;\nresult = JSON.stringify({ templateId, totalClauses: clauses.length, findings, findingCount: findings.length, bySeverity, riskScore: Math.min(riskScore, 100), riskLevel: riskScore > 50 ? 'high' : riskScore > 20 ? 'medium' : 'low' });",
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
        executeCode: "const domain = args.companyDomain || '';\nconst name = args.companyName || '';\nconst tld = domain.split('.').pop() || '';\nconst domainBase = domain.replace(/^www\\./, '').split('.')[0] || '';\nconst isEnterprise = ['com', 'io', 'co', 'ai'].includes(tld);\nresult = JSON.stringify({\n  status: 'external_data_required',\n  companyDomain: domain,\n  companyName: name,\n  instruction: 'This tool requires external API access (Clearbit, LinkedIn, Crunchbase). Provide company data directly or use web search.',\n  enrichmentSources: [\n    { source: 'clearbit', endpoint: 'https://company.clearbit.com/v2/companies/find?domain=' + domain },\n    { source: 'linkedin', searchUrl: 'https://www.linkedin.com/company/' + domainBase },\n    { source: 'crunchbase', searchUrl: 'https://www.crunchbase.com/organization/' + domainBase }\n  ],\n  dataPointsToCollect: ['industry', 'employeeCount', 'annualRevenue', 'fundingTotal', 'foundedYear', 'headquarters', 'techStack', 'socialProfiles', 'recentNews'],\n  inferredData: { domain, possibleLinkedIn: 'linkedin.com/company/' + domainBase, likelyEnterprise: isEnterprise && domainBase.length > 3 }\n});",
      },
      {
        name: "check_crm_history",
        description: "Checks CRM for existing relationship with this company",
        params: `{ "companyDomain": { "type": "string" } }`,
        executeCode: "const domain = args.companyDomain || '';\nresult = JSON.stringify({\n  status: 'external_data_required',\n  companyDomain: domain,\n  instruction: 'This tool requires CRM access (Salesforce, HubSpot, etc.). Provide CRM records directly if available.',\n  crmQueries: {\n    salesforce: 'SELECT Id, Name, OwnerId, LastActivityDate, Amount FROM Opportunity WHERE Account.Website LIKE \\'%' + domain + '%\\'',\n    hubspot: 'GET /crm/v3/objects/companies/search with domain filter: ' + domain\n  },\n  dataPointsNeeded: ['existingContacts', 'dealHistory', 'lastInteractionDate', 'accountOwner', 'totalRevenue', 'openOpportunities', 'supportTickets']\n});",
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
        executeCode: "const platform = args.platform;\nconst dateRange = args.dateRange || 'last_30_days';\nresult = JSON.stringify({\n  status: 'external_data_required',\n  platform: platform,\n  dateRange: dateRange,\n  instruction: 'Provide campaign metrics data directly. Expected format: array of campaign objects.',\n  expectedFields: platform === 'email' \n    ? ['campaignName', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'revenue']\n    : ['campaignName', 'impressions', 'clicks', 'spend', 'conversions', 'revenue', 'ctr', 'cpc', 'roas'],\n  apiEndpoints: {\n    google: 'Google Ads API - /customers/{id}/googleAds:searchStream',\n    meta: 'Meta Marketing API - /act_{id}/insights',\n    linkedin: 'LinkedIn Marketing API - /adAnalytics',\n    email: 'Mailchimp/SendGrid API - /campaigns/{id}/stats'\n  },\n  analysisCapabilities: ['ROAS calculation', 'CPA optimization', 'CTR benchmarking', 'Budget allocation recommendations', 'Funnel drop-off analysis']\n});",
      },
      {
        name: "calculate_attribution",
        description: "Computes multi-touch attribution across conversion paths",
        params: `{ "conversionPaths": { "type": "array" } }`,
        executeCode: "const paths = args.conversionPaths || [];\nif (paths.length === 0) { result = JSON.stringify({ error: 'No conversion paths provided. Provide array of {touchpoints: [{channel, timestamp}], conversionValue: number}' }); }\nelse {\n  const channelCredits = { firstTouch: {}, lastTouch: {}, linear: {}, timeDecay: {} };\n  let totalValue = 0;\n  for (const path of paths) {\n    const tps = path.touchpoints || path.touches || [];\n    const value = path.conversionValue || path.value || 1;\n    totalValue += value;\n    if (tps.length === 0) continue;\n    const first = tps[0].channel || tps[0].source || 'unknown';\n    const last = tps[tps.length - 1].channel || tps[tps.length - 1].source || 'unknown';\n    channelCredits.firstTouch[first] = (channelCredits.firstTouch[first] || 0) + value;\n    channelCredits.lastTouch[last] = (channelCredits.lastTouch[last] || 0) + value;\n    const linearShare = value / tps.length;\n    for (const tp of tps) {\n      const ch = tp.channel || tp.source || 'unknown';\n      channelCredits.linear[ch] = (channelCredits.linear[ch] || 0) + linearShare;\n    }\n    const totalWeight = tps.reduce((s, _, i) => s + Math.pow(0.5, tps.length - 1 - i), 0);\n    tps.forEach((tp, i) => {\n      const ch = tp.channel || tp.source || 'unknown';\n      const weight = Math.pow(0.5, tps.length - 1 - i) / totalWeight;\n      channelCredits.timeDecay[ch] = (channelCredits.timeDecay[ch] || 0) + value * weight;\n    });\n  }\n  const round = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Math.round(v * 100) / 100]));\n  result = JSON.stringify({ totalConversions: paths.length, totalValue, models: { firstTouch: round(channelCredits.firstTouch), lastTouch: round(channelCredits.lastTouch), linear: round(channelCredits.linear), timeDecay: round(channelCredits.timeDecay) } });\n}",
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
        executeCode: "const baseline = args.baseline || [];\nconst current = args.current || [];\nconst numBins = args.bins || 10;\nif (baseline.length === 0 || current.length === 0) { result = JSON.stringify({ error: 'Both baseline and current distributions must be non-empty arrays of numbers' }); }\nelse {\n  const allVals = [...baseline, ...current].sort((a, b) => a - b);\n  const minVal = allVals[0]; const maxVal = allVals[allVals.length - 1];\n  const binWidth = (maxVal - minVal) / numBins;\n  const getBinCounts = (data) => {\n    const counts = new Array(numBins).fill(0);\n    for (const v of data) {\n      let bin = Math.floor((v - minVal) / binWidth);\n      if (bin >= numBins) bin = numBins - 1;\n      if (bin < 0) bin = 0;\n      counts[bin]++;\n    }\n    return counts.map(c => c / data.length);\n  };\n  const basePcts = getBinCounts(baseline);\n  const currPcts = getBinCounts(current);\n  let psi = 0;\n  const binDetails = [];\n  for (let i = 0; i < numBins; i++) {\n    const bp = Math.max(basePcts[i], 0.0001);\n    const cp = Math.max(currPcts[i], 0.0001);\n    const contribution = (cp - bp) * Math.log(cp / bp);\n    psi += contribution;\n    binDetails.push({ bin: i, range: [Math.round((minVal + i * binWidth) * 1000) / 1000, Math.round((minVal + (i+1) * binWidth) * 1000) / 1000], baselinePct: Math.round(bp * 10000) / 100, currentPct: Math.round(cp * 10000) / 100, contribution: Math.round(contribution * 10000) / 10000 });\n  }\n  psi = Math.round(psi * 10000) / 10000;\n  const interpretation = psi < 0.1 ? 'No significant shift' : psi < 0.2 ? 'Moderate shift - monitor closely' : 'Significant shift - investigate and consider retraining';\n  result = JSON.stringify({ psi, interpretation, baselineSize: baseline.length, currentSize: current.length, numBins, binDetails });\n}",
      },
      {
        name: "get_inference_logs",
        description: "Fetches recent model inference data with features and predictions",
        params: `{ "modelId": { "type": "string" }, "window": { "type": "string" } }`,
        executeCode: "const modelId = args.modelId;\nconst window = args.window || '1h';\nresult = JSON.stringify({\n  status: 'external_data_required',\n  modelId: modelId,\n  window: window,\n  instruction: 'Provide inference log data as an array of {timestamp, features: {}, prediction, actual?, latencyMs, modelVersion} objects.',\n  analysisCapabilities: [\n    'Feature drift detection (PSI per feature)',\n    'Prediction distribution shift',\n    'Latency percentiles (p50, p95, p99)',\n    'Error rate tracking',\n    'Data quality checks (nulls, outliers)'\n  ],\n  sampleInput: [{ timestamp: '2024-01-01T10:00:00Z', features: { age: 35, income: 75000 }, prediction: 0.82, actual: 1, latencyMs: 12, modelVersion: 'v2.1' }]\n});",
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
        executeCode: "const lockfile = args.lockfile || '';\nconst deps = [];\nconst npmMatch = lockfile.match(/\"([^\"]+)\":\\s*\\{[^}]*\"version\":\\s*\"([^\"]+)\"/g);\nif (npmMatch) {\n  for (const m of npmMatch) {\n    const parts = m.match(/\"([^\"]+)\":\\s*\\{[^}]*\"version\":\\s*\"([^\"]+)\"/);\n    if (parts) deps.push({ name: parts[1], version: parts[2] });\n  }\n}\nconst pipMatch = lockfile.match(/([a-zA-Z0-9_-]+)==([\\d.]+)/g);\nif (pipMatch) {\n  for (const m of pipMatch) {\n    const [name, version] = m.split('==');\n    deps.push({ name, version });\n  }\n}\nconst yarnMatch = lockfile.match(/\"?([^\"@\\n]+)@[^\"\\n]+\"?:\\s*\\n\\s*version\\s+\"([^\"]+)\"/g);\nif (yarnMatch) {\n  for (const m of yarnMatch) {\n    const parts = m.match(/\"?([^\"@\\n]+)@[^\"\\n]+\"?:\\s*\\n\\s*version\\s+\"([^\"]+)\"/);\n    if (parts) deps.push({ name: parts[1].trim(), version: parts[2] });\n  }\n}\nif (deps.length === 0) {\n  const lines = lockfile.split('\\n').filter(l => l.trim());\n  for (const line of lines) {\n    const simple = line.match(/^\\s*[\"']?([^\"'\\s:@]+)[\"']?\\s*[:@=]\\s*[\"']?([\\d][\\d.]*)/); \n    if (simple) deps.push({ name: simple[1], version: simple[2] });\n  }\n}\nconst knownVulns = { 'lodash': '4.17.21', 'minimist': '1.2.6', 'node-fetch': '2.6.7', 'axios': '1.6.0', 'express': '4.18.2', 'jsonwebtoken': '9.0.0', 'tar': '6.1.9', 'json5': '2.2.2', 'semver': '7.5.2', 'qs': '6.10.3', 'shell-quote': '1.7.3', 'trim-newlines': '4.0.2', 'glob-parent': '5.1.2', 'trim': '0.0.3', 'underscore': '1.13.6' };\nconst findings = [];\nfor (const dep of deps) {\n  const safe = knownVulns[dep.name];\n  if (safe) {\n    const cv = dep.version.split('.').map(Number);\n    const sv = safe.split('.').map(Number);\n    let vuln = false;\n    for (let i = 0; i < 3; i++) { if ((cv[i]||0) < (sv[i]||0)) { vuln = true; break; } if ((cv[i]||0) > (sv[i]||0)) break; }\n    if (vuln) findings.push({ package: dep.name, installedVersion: dep.version, fixedVersion: safe, severity: 'high' });\n  }\n}\nresult = JSON.stringify({ totalDependencies: deps.length, vulnerabilities: findings.length, findings, dependencies: deps.slice(0, 50) });",
      },
      {
        name: "analyze_entropy",
        description: "Calculates Shannon entropy of strings to detect potential secrets",
        params: `{ "strings": { "type": "array", "items": { "type": "string" } } }`,
        executeCode: "const strings = args.strings || [];\nconst results = [];\nfor (const str of strings) {\n  const freq = {};\n  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;\n  let entropy = 0;\n  const len = str.length;\n  for (const count of Object.values(freq)) {\n    const p = count / len;\n    if (p > 0) entropy -= p * Math.log(p) / Math.log(2);\n  }\n  entropy = Math.round(entropy * 1000) / 1000;\n  const hasHexPattern = /^[0-9a-fA-F]{16,}$/.test(str);\n  const hasBase64Pattern = /^[A-Za-z0-9+/=]{20,}$/.test(str);\n  const looksLikeJWT = /^eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/.test(str);\n  const hasKeyPrefix = /^(sk_|pk_|api_|key_|token_|secret_|aws_|AKIA|ghp_|gho_|ghu_|ghs_|ghr_|xox[bsrap]-|glpat-|v2\\.)/.test(str);\n  const isHighEntropy = entropy > 4.5 && len > 8;\n  const isPotentialSecret = isHighEntropy || hasHexPattern || hasBase64Pattern || looksLikeJWT || hasKeyPrefix;\n  const reasons = [];\n  if (isHighEntropy) reasons.push('High Shannon entropy (' + entropy + ' bits)');\n  if (hasHexPattern) reasons.push('Matches hex string pattern');\n  if (hasBase64Pattern) reasons.push('Matches base64 pattern');\n  if (looksLikeJWT) reasons.push('Looks like a JWT token');\n  if (hasKeyPrefix) reasons.push('Has known API key prefix');\n  results.push({ value: str.length > 20 ? str.slice(0, 8) + '...' + str.slice(-4) : str, fullLength: len, entropy, isPotentialSecret, confidence: isPotentialSecret ? (reasons.length >= 2 ? 'high' : 'medium') : 'low', reasons });\n}\nconst secrets = results.filter(r => r.isPotentialSecret);\nresult = JSON.stringify({ totalAnalyzed: results.length, potentialSecrets: secrets.length, results });",
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
        executeCode: "const query = args.query || '';\nconst sources = args.sources || [];\nconst queryWords = query.toLowerCase().split(/\\s+/).filter(w => w.length > 2);\nresult = JSON.stringify({\n  status: 'external_data_required',\n  query: query,\n  sources: sources,\n  instruction: 'Provide documents as an array of {title, content, source, url?, tags?} objects. This tool will perform keyword matching and relevance scoring.',\n  queryTokens: queryWords,\n  searchStrategy: {\n    primary: 'Full-text keyword matching across title and content',\n    scoring: 'TF-IDF inspired: matches / total_words * log(doc_count / docs_with_term)',\n    fallback: 'If no results, broaden search by removing least common terms'\n  },\n  tip: 'For best results, provide the documentation corpus in the sources array as structured objects.'\n});",
      },
      {
        name: "get_runbook",
        description: "Retrieves a specific operational runbook by name",
        params: `{ "runbookName": { "type": "string" } }`,
        executeCode: "const name = args.runbookName || '';\nconst normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '_');\nresult = JSON.stringify({\n  status: 'external_data_required',\n  runbookName: name,\n  normalizedKey: normalized,\n  instruction: 'Provide the runbook content as a structured object with {title, description, steps: [{order, action, command?, expected?, rollback?}], prerequisites, tags}.',\n  commonRunbooks: {\n    'database_failover': { description: 'Steps to fail over to database replica', tags: ['database', 'ha', 'incident'] },\n    'deploy_rollback': { description: 'Roll back a failed deployment', tags: ['deploy', 'rollback'] },\n    'scale_up': { description: 'Horizontally scale application tier', tags: ['scaling', 'performance'] },\n    'cert_renewal': { description: 'Renew SSL/TLS certificates', tags: ['security', 'certificates'] },\n    'incident_response': { description: 'General incident response procedure', tags: ['incident', 'oncall'] }\n  }\n});",
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
        executeCode: "const content = args.content || '';\nconst format = args.format || 'csv';\nlet items = [];\nif (format === 'json') {\n  try {\n    const parsed = JSON.parse(content);\n    items = Array.isArray(parsed) ? parsed : parsed.items || parsed.data || parsed.lineItems || [parsed];\n  } catch (e) { result = JSON.stringify({ error: 'Invalid JSON: ' + e.message }); }\n}\nif (format === 'csv' || items.length === 0 && format !== 'json') {\n  const lines = content.trim().split('\\n');\n  if (lines.length >= 2) {\n    const headers = lines[0].split(',').map(h => h.trim().replace(/^\"|\"$/g, ''));\n    for (let i = 1; i < lines.length; i++) {\n      const vals = []; let inQ = false; let cur = '';\n      for (const ch of lines[i]) { if (ch === '\"') { inQ = !inQ; continue; } if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue; } cur += ch; }\n      vals.push(cur.trim());\n      const row = {};\n      headers.forEach((h, idx) => { const v = vals[idx] || ''; row[h] = isNaN(parseFloat(v.replace(/[,$%]/g, ''))) ? v : parseFloat(v.replace(/[,$%]/g, '')); });\n      items.push(row);\n    }\n  }\n}\nif (!items.length) { result = JSON.stringify({ error: 'Could not parse content. Check format parameter.' }); }\nelse {\n  const numericFields = Object.keys(items[0]).filter(k => typeof items[0][k] === 'number');\n  const summary = {};\n  for (const field of numericFields) {\n    const values = items.map(i => i[field]).filter(v => typeof v === 'number' && !isNaN(v));\n    summary[field] = { total: Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100, min: Math.min(...values), max: Math.max(...values), avg: Math.round(values.reduce((s, v) => s + v, 0) / values.length * 100) / 100, count: values.length };\n  }\n  result = JSON.stringify({ lineItemCount: items.length, fields: Object.keys(items[0]), numericFields, summary, items: items.slice(0, 20) });\n}",
      },
      {
        name: "get_industry_benchmark",
        description: "Retrieves industry benchmark data for comparison",
        params: `{ "industry": { "type": "string" }, "stage": { "type": "string" }, "metric": { "type": "string" } }`,
        executeCode: "const industry = (args.industry || '').toLowerCase();\nconst stage = (args.stage || '').toLowerCase();\nconst metric = (args.metric || '').toLowerCase();\nconst benchmarks = {\n  'saas': {\n    'seed': { 'growth_rate': { median: 15, top_quartile: 30, unit: '% MoM' }, 'burn_multiple': { median: 3.0, top_quartile: 1.5, unit: 'x' }, 'ltv_cac': { median: 1.5, top_quartile: 3.0, unit: 'x' }, 'gross_margin': { median: 65, top_quartile: 75, unit: '%' }, 'churn': { median: 5, top_quartile: 2, unit: '% monthly' } },\n    'series_a': { 'growth_rate': { median: 10, top_quartile: 20, unit: '% MoM' }, 'burn_multiple': { median: 2.5, top_quartile: 1.2, unit: 'x' }, 'ltv_cac': { median: 2.5, top_quartile: 4.0, unit: 'x' }, 'gross_margin': { median: 68, top_quartile: 78, unit: '%' }, 'churn': { median: 3, top_quartile: 1.5, unit: '% monthly' }, 'ndr': { median: 105, top_quartile: 120, unit: '%' } },\n    'series_b': { 'growth_rate': { median: 80, top_quartile: 120, unit: '% YoY' }, 'burn_multiple': { median: 2.0, top_quartile: 1.0, unit: 'x' }, 'ltv_cac': { median: 3.0, top_quartile: 5.0, unit: 'x' }, 'gross_margin': { median: 72, top_quartile: 82, unit: '%' }, 'rule_of_40': { median: 25, top_quartile: 45, unit: '%' } },\n    'growth': { 'growth_rate': { median: 40, top_quartile: 80, unit: '% YoY' }, 'gross_margin': { median: 75, top_quartile: 85, unit: '%' }, 'rule_of_40': { median: 30, top_quartile: 55, unit: '%' }, 'magic_number': { median: 0.7, top_quartile: 1.2, unit: 'x' } }\n  },\n  'ecommerce': {\n    'seed': { 'growth_rate': { median: 20, top_quartile: 50, unit: '% MoM' }, 'gross_margin': { median: 40, top_quartile: 55, unit: '%' }, 'cac_payback': { median: 6, top_quartile: 3, unit: 'months' } },\n    'growth': { 'growth_rate': { median: 30, top_quartile: 60, unit: '% YoY' }, 'gross_margin': { median: 45, top_quartile: 60, unit: '%' }, 'repeat_rate': { median: 25, top_quartile: 40, unit: '%' } }\n  },\n  'fintech': {\n    'series_a': { 'growth_rate': { median: 12, top_quartile: 25, unit: '% MoM' }, 'gross_margin': { median: 55, top_quartile: 70, unit: '%' }, 'ltv_cac': { median: 2.0, top_quartile: 3.5, unit: 'x' } },\n    'growth': { 'growth_rate': { median: 50, top_quartile: 100, unit: '% YoY' }, 'take_rate': { median: 1.5, top_quartile: 2.5, unit: '%' } }\n  }\n};\nconst industryData = benchmarks[industry];\nif (!industryData) { result = JSON.stringify({ error: 'Industry not found', availableIndustries: Object.keys(benchmarks), suggestion: 'Try: saas, ecommerce, fintech' }); }\nelse {\n  const stageData = industryData[stage];\n  if (!stageData) { result = JSON.stringify({ industry, error: 'Stage not found', availableStages: Object.keys(industryData) }); }\n  else if (metric && stageData[metric]) { result = JSON.stringify({ industry, stage, metric, benchmark: stageData[metric] }); }\n  else if (metric) { result = JSON.stringify({ industry, stage, error: 'Metric not found', availableMetrics: Object.keys(stageData) }); }\n  else { result = JSON.stringify({ industry, stage, benchmarks: stageData }); }\n}",
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
        executeCode: "let oldSpec, newSpec;\ntry { oldSpec = JSON.parse(args.oldSpec); } catch(e) { oldSpec = null; }\ntry { newSpec = JSON.parse(args.newSpec); } catch(e) { newSpec = null; }\nif (!oldSpec || !newSpec) { result = JSON.stringify({ error: 'Both oldSpec and newSpec must be valid JSON OpenAPI specifications' }); }\nelse {\n  const changes = [];\n  const oldPaths = Object.keys(oldSpec.paths || {});\n  const newPaths = Object.keys(newSpec.paths || {});\n  const addedPaths = newPaths.filter(p => !oldPaths.includes(p));\n  const removedPaths = oldPaths.filter(p => !newPaths.includes(p));\n  const commonPaths = oldPaths.filter(p => newPaths.includes(p));\n  for (const p of addedPaths) {\n    const methods = Object.keys(newSpec.paths[p]).filter(m => ['get','post','put','patch','delete','head','options'].includes(m));\n    changes.push({ type: 'added', path: p, methods, breaking: false });\n  }\n  for (const p of removedPaths) {\n    changes.push({ type: 'removed', path: p, breaking: true, impact: 'Consumers using this endpoint will break' });\n  }\n  for (const p of commonPaths) {\n    const oldMethods = Object.keys(oldSpec.paths[p]).filter(m => ['get','post','put','patch','delete'].includes(m));\n    const newMethods = Object.keys(newSpec.paths[p]).filter(m => ['get','post','put','patch','delete'].includes(m));\n    const removedMethods = oldMethods.filter(m => !newMethods.includes(m));\n    for (const m of removedMethods) changes.push({ type: 'method_removed', path: p, method: m, breaking: true });\n    const addedMethods = newMethods.filter(m => !oldMethods.includes(m));\n    for (const m of addedMethods) changes.push({ type: 'method_added', path: p, method: m, breaking: false });\n    for (const m of oldMethods.filter(mt => newMethods.includes(mt))) {\n      const oldParams = (oldSpec.paths[p][m].parameters || []).map(pr => pr.name);\n      const newParams = (newSpec.paths[p][m].parameters || []).map(pr => pr.name);\n      const addedParams = newParams.filter(pr => !oldParams.includes(pr));\n      const removedParams = oldParams.filter(pr => !newParams.includes(pr));\n      const newRequired = (newSpec.paths[p][m].parameters || []).filter(pr => pr.required && !oldParams.includes(pr.name));\n      if (removedParams.length) changes.push({ type: 'params_removed', path: p, method: m, params: removedParams, breaking: true });\n      if (newRequired.length) changes.push({ type: 'required_param_added', path: p, method: m, params: newRequired.map(pr => pr.name), breaking: true });\n      if (addedParams.length && !newRequired.length) changes.push({ type: 'optional_params_added', path: p, method: m, params: addedParams, breaking: false });\n    }\n  }\n  const breakingChanges = changes.filter(c => c.breaking);\n  const versionChange = (oldSpec.info?.version || '') !== (newSpec.info?.version || '');\n  result = JSON.stringify({ totalChanges: changes.length, breakingChanges: breakingChanges.length, nonBreaking: changes.length - breakingChanges.length, versionChanged: versionChange, oldVersion: oldSpec.info?.version, newVersion: newSpec.info?.version, changes, recommendation: breakingChanges.length > 0 ? 'Breaking changes detected - bump major version and notify consumers' : 'Non-breaking changes only - safe for minor version bump' });\n}",
      },
      {
        name: "list_api_consumers",
        description: "Lists known API consumers from API gateway logs",
        params: `{ "endpointPattern": { "type": "string" } }`,
        executeCode: "const pattern = args.endpointPattern || '';\nresult = JSON.stringify({\n  status: 'external_data_required',\n  endpointPattern: pattern,\n  instruction: 'Provide API gateway/access logs as an array of {endpoint, method, consumerKey?, consumerName?, userAgent?, ip?, requestCount, lastSeen} objects.',\n  analysisCapabilities: [\n    'Consumer identification by API key or user agent',\n    'Usage frequency and patterns',\n    'Endpoint dependency mapping',\n    'Impact analysis for breaking changes'\n  ],\n  sources: ['API Gateway logs (AWS API GW, Kong, Apigee)', 'Load balancer access logs', 'Application-level request logging']\n});",
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
        executeCode: "const sources = args.sources || [];\nconst since = args.since || '';\nresult = JSON.stringify({\n  status: 'external_data_required',\n  sources: sources,\n  since: since,\n  instruction: 'Provide feedback data as an array of {source, text, rating?, category?, userId?, timestamp, sentiment?} objects.',\n  analysisCapabilities: [\n    'Sentiment analysis (keyword-based)',\n    'Category clustering',\n    'Trend detection over time',\n    'Common theme extraction',\n    'NPS/CSAT calculation'\n  ],\n  supportedSources: ['zendesk', 'intercom', 'app_store', 'play_store', 'twitter', 'survey', 'email', 'in_app'],\n  sampleInput: [{ source: 'zendesk', text: 'Login page is slow after the update', rating: 2, category: 'performance', timestamp: '2024-01-15T10:00:00Z' }]\n});",
      },
      {
        name: "check_known_issues",
        description: "Checks if feedback matches any known open issues in Jira",
        params: `{ "keywords": { "type": "array", "items": { "type": "string" } } }`,
        executeCode: "const keywords = args.keywords || [];\nresult = JSON.stringify({\n  status: 'external_data_required',\n  keywords: keywords,\n  instruction: 'Provide known issues as an array of {key, summary, status, priority, labels, created, updated} objects. This tool will match keywords against issue summaries and labels.',\n  jqlQuery: 'status in (Open, \"In Progress\", Reopened) AND (' + keywords.map(k => 'summary ~ \"' + k + '\" OR description ~ \"' + k + '\"').join(' OR ') + ')',\n  matchingStrategy: {\n    primary: 'Keyword matching against summary and labels',\n    scoring: 'Number of keyword matches / total keywords',\n    threshold: 'Score > 0.3 considered a potential match'\n  }\n});",
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

  // 16. Agent Team: Full-Stack Code Review
  {
    slug: "agent-team-code-review",
    title: "Agent Team: Full-Stack Code Review",
    domain: "Multi-Agent / DevOps",
    icon: Network,
    tagline: "Three specialist agents review code in parallel, then a coordinator synthesizes a unified report",
    description:
      "A team of 3 specialized agents (security, performance, conventions) reviews code in parallel. Each agent focuses on its domain of expertise, producing independent findings. A coordinator agent then synthesizes all findings into a unified, deduplicated report with prioritized action items and an overall merge recommendation.",
    timeSaved: "45-90 min per complex PR reduced to 20 seconds of parallel analysis",
    costReduction: "~$80K/year for a team of 10 developers (replaces 3 senior reviewer passes)",
    riskMitigation: "3x coverage depth — security, performance, and convention issues caught simultaneously",
    systemPrompt: `You are a coordinator agent managing a team of 3 specialist code reviewers. Your role is to orchestrate parallel reviews and synthesize findings.

Workflow:
1. Receive the PR diff and metadata (files changed, author, branch)
2. Delegate to specialists in parallel:
   - security_agent: OWASP Top 10, auth flaws, injection, data exposure
   - performance_agent: O(n²) loops, memory leaks, unnecessary re-renders, bundle size
   - conventions_agent: naming, file structure, test coverage, documentation
3. Collect all specialist reports
4. Deduplicate overlapping findings (prefer the specialist's version)
5. Resolve conflicts (e.g., security recommends X, performance recommends Y)
6. Produce unified report with priority ranking

Output JSON:
{
  "overallScore": 0-100,
  "canMerge": boolean,
  "specialistScores": { "security": number, "performance": number, "conventions": number },
  "findings": [{ "source": string, "severity": string, "category": string, "file": string, "line": number, "message": string, "suggestion": string }],
  "conflicts": [{ "finding1": string, "finding2": string, "resolution": string }],
  "summary": string
}

Merge policy: canMerge = true only if overallScore >= 70 AND security score >= 80 AND no critical findings.`,
    skills: [
      {
        name: "team-coordination-protocol",
        content: `<skill name="team-coordination-protocol">
Team Coordination Protocol for Multi-Agent Code Review:

1. Task Distribution:
   - Parse the diff to identify file types and changed sections
   - Route security-relevant files (auth, API, DB queries) with HIGH priority to security_agent
   - Route performance-critical paths (loops, data fetching, rendering) to performance_agent
   - Send all files to conventions_agent for baseline checks

2. Parallel Execution:
   - All 3 agents run simultaneously with a 30-second timeout
   - If a specialist times out, mark its findings as "incomplete" and proceed
   - Each specialist returns: { score: number, findings: [], confidence: number }

3. Conflict Resolution Rules:
   - Security always wins over performance (e.g., "use parameterized queries" even if slower)
   - Performance wins over conventions (e.g., allow unconventional code if 10x faster)
   - When in doubt, flag for human review rather than auto-resolving

4. Deduplication:
   - Same file + same line + overlapping message = duplicate
   - Keep the version from the most relevant specialist
   - Merge severity upward (if security says "high" and conventions says "medium", use "high")
</skill>`,
      },
      {
        name: "review-synthesis-template",
        content: `<skill name="review-synthesis-template">
Unified Review Synthesis Template:

## Executive Summary
[2-3 sentences: overall quality, biggest concern, recommendation]

## Specialist Scores
| Agent | Score | Findings | Critical |
|-------|-------|----------|----------|
| Security | X/100 | N | Y/N |
| Performance | X/100 | N | Y/N |
| Conventions | X/100 | N | Y/N |

## Critical Findings (must fix before merge)
[List with file, line, specialist source, and suggested fix]

## Important Findings (should fix)
[List with file, line, specialist source, and suggested fix]

## Minor Findings (nice to have)
[Grouped by category]

## Conflicts Resolved
[Any cases where specialists disagreed, with resolution rationale]

## Merge Recommendation
[APPROVE / REQUEST_CHANGES / BLOCK with justification]
</skill>`,
      },
    ],
    tools: [
      {
        name: "delegate_to_specialist",
        description: "Sends code diff to a specialist agent for focused review and waits for the report",
        params: `{ "specialist": { "type": "string", "enum": ["security_agent", "performance_agent", "conventions_agent"] }, "diff": { "type": "string" }, "context": { "type": "object", "properties": { "language": { "type": "string" }, "framework": { "type": "string" }, "filePaths": { "type": "array", "items": { "type": "string" } } } } }`,
        executeCode: "const specialist = args.specialist || 'general';\nconst diff = args.diff || '';\nconst context = args.context || {};\nconst specialistPrompts = {\n  'security': { focus: ['injection vulnerabilities', 'auth/authz issues', 'data exposure', 'CSRF/XSS', 'secrets in code', 'insecure dependencies'], checklist: ['Input validation', 'Output encoding', 'Authentication checks', 'Authorization enforcement', 'Cryptographic practices', 'Error handling/info leakage'] },\n  'performance': { focus: ['N+1 queries', 'missing indexes', 'memory leaks', 'unbounded operations', 'blocking I/O', 'cache misses'], checklist: ['Algorithm complexity', 'Database query efficiency', 'Memory allocation patterns', 'Concurrency issues', 'Caching strategy', 'Resource cleanup'] },\n  'architecture': { focus: ['SOLID violations', 'coupling issues', 'abstraction leaks', 'naming conventions', 'design patterns', 'dependency management'], checklist: ['Single responsibility', 'Interface segregation', 'Dependency inversion', 'Layer boundaries', 'Error propagation', 'API contract stability'] },\n  'testing': { focus: ['untested paths', 'edge cases', 'test isolation', 'flaky patterns', 'coverage gaps', 'assertion quality'], checklist: ['Branch coverage', 'Error path testing', 'Boundary conditions', 'Mock appropriateness', 'Test independence', 'Meaningful assertions'] },\n  'general': { focus: ['code clarity', 'error handling', 'documentation', 'conventions', 'maintainability'], checklist: ['Readability', 'Error handling', 'Naming', 'Comments', 'DRY compliance'] }\n};\nconst spec = specialistPrompts[specialist] || specialistPrompts['general'];\nconst diffLines = diff.split('\\n').length;\nconst addedLines = (diff.match(/^\\+[^+]/gm) || []).length;\nconst removedLines = (diff.match(/^-[^-]/gm) || []).length;\nresult = JSON.stringify({ specialist, diffStats: { totalLines: diffLines, added: addedLines, removed: removedLines }, reviewFocus: spec.focus, checklist: spec.checklist, context, instruction: 'Review the diff according to the ' + specialist + ' checklist. Flag issues with severity (critical/high/medium/low), line reference, and suggested fix.', diff: diff.length > 5000 ? diff.slice(0, 5000) + '\\n... (truncated)' : diff });",
      },
      {
        name: "merge_reviews",
        description: "Combines multiple specialist review reports, deduplicates findings, and resolves conflicts",
        params: `{ "reviews": { "type": "array", "items": { "type": "object", "properties": { "specialist": { "type": "string" }, "score": { "type": "number" }, "findings": { "type": "array" }, "confidence": { "type": "number" } } } }, "conflictStrategy": { "type": "string", "enum": ["security_first", "performance_first", "flag_for_human"], "default": "security_first" } }`,
        executeCode: "const reviews = args.reviews || [];\nconst strategy = args.conflictStrategy || 'highest_severity';\nconst allFindings = [];\nfor (const review of reviews) {\n  const specialist = review.specialist || review.reviewer || 'unknown';\n  const findings = review.findings || review.issues || [];\n  for (const f of findings) {\n    allFindings.push({ ...f, specialist, id: (f.file || '') + ':' + (f.line || 0) + ':' + (f.message || f.title || '').slice(0, 50) });\n  }\n}\nconst grouped = {};\nfor (const f of allFindings) {\n  const key = (f.file || '') + ':' + (f.line || f.location || 'unknown');\n  if (!grouped[key]) grouped[key] = [];\n  grouped[key].push(f);\n}\nconst sevOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };\nconst merged = [];\nconst duplicates = [];\nfor (const [loc, findings] of Object.entries(grouped)) {\n  if (findings.length > 1) {\n    const messages = findings.map(f => (f.message || f.title || '').toLowerCase());\n    const isDuplicate = messages.some((m, i) => messages.some((m2, j) => i !== j && (m.includes(m2) || m2.includes(m) || m === m2)));\n    if (isDuplicate) {\n      const winner = strategy === 'highest_severity' ? findings.sort((a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0))[0] : findings[0];\n      winner.agreedBy = [...new Set(findings.map(f => f.specialist))];\n      merged.push(winner);\n      duplicates.push({ location: loc, count: findings.length, specialists: winner.agreedBy });\n      continue;\n    }\n  }\n  merged.push(...findings);\n}\nmerged.sort((a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0));\nconst bySeverity = {};\nmerged.forEach(f => { bySeverity[f.severity || 'unknown'] = (bySeverity[f.severity || 'unknown'] || 0) + 1; });\nresult = JSON.stringify({ totalFindings: merged.length, deduplicated: duplicates.length, bySeverity, conflictStrategy: strategy, reviewers: [...new Set(reviews.map(r => r.specialist || r.reviewer))], findings: merged, deduplicationDetails: duplicates });",
      },
    ],
    mcpIntegration: `Triggered on PR open/update via GitHub webhook.
POST diff + metadata to /api/mcp.
Coordinator delegates to 3 specialist agents in parallel.
Unified report posted as PR comment within 30 seconds.
Blocks merge if canMerge is false.`,
    gradingSuite: [
      {
        caseName: "Detect SQL injection across specialists",
        input: `const query = "SELECT * FROM users WHERE id = " + req.params.id; // also has O(n²) nested loop below\nfor (let i = 0; i < users.length; i++) { for (let j = 0; j < users.length; j++) { compare(users[i], users[j]); } }`,
        criteria: `- output_match: security agent flags SQL injection as critical (weight: 0.3)
- output_match: performance agent flags O(n²) loop (weight: 0.3)
- output_match: unified report contains both findings deduplicated (weight: 0.2)
- output_match: canMerge is false due to critical security finding (weight: 0.2)`,
      },
      {
        caseName: "Resolve security vs performance conflict",
        input: `// Using raw SQL for performance-critical batch insert\nconst sql = items.map(i => \`INSERT INTO orders VALUES ('\${i.id}', '\${i.name}')\`).join(';');`,
        criteria: `- output_match: security flags string interpolation in SQL (weight: 0.3)
- output_match: performance acknowledges batch insert intent (weight: 0.2)
- output_match: conflict resolution recommends parameterized batch insert (weight: 0.3)
- output_match: security recommendation takes priority (weight: 0.2)`,
      },
    ],
  },

  // 17. Content Pipeline: Research → Write → SEO
  {
    slug: "pipeline-content-creator",
    title: "Content Pipeline: Research → Write → SEO",
    domain: "Pipeline / Content",
    icon: Layers,
    tagline: "A 3-step pipeline where agents research, write, and optimize content sequentially",
    description:
      "A 3-step sequential pipeline: Agent 1 researches a topic by searching multiple sources and extracting key facts. Agent 2 transforms the research into polished, structured content matching the brand voice. Agent 3 optimizes the content for SEO — meta tags, keyword density, internal linking, readability score. Each step's output feeds the next.",
    timeSaved: "4-6 hours per article reduced to 15 minutes of review",
    costReduction: "~$60K/year replacing freelance writer + SEO specialist costs",
    riskMitigation: "Consistent brand voice and SEO compliance across 100% of published content",
    systemPrompt: `You are a content pipeline orchestrator managing a 3-stage sequential workflow.

Pipeline Stages:
1. RESEARCH (Agent 1):
   - Search 5-10 authoritative sources on the given topic
   - Extract key facts, statistics, expert quotes, and trends
   - Identify content gaps in existing top-ranking articles
   - Output: { sources: [...], keyFacts: [...], contentGaps: [...], suggestedAngle: string }

2. WRITE (Agent 2):
   - Receive research output as context
   - Write article following the content-style-guide skill
   - Structure: hook intro, H2/H3 sections, data-backed claims, actionable conclusion
   - Target: 1500-2500 words, Flesch reading score 60-70
   - Output: { title: string, content: string, wordCount: number, readingLevel: string }

3. SEO_OPTIMIZE (Agent 3):
   - Receive written article
   - Apply seo-checklist skill
   - Optimize: meta title (<60 chars), meta description (<155 chars), keyword placement, internal links
   - Output: { optimizedContent: string, metaTitle: string, metaDescription: string, seoScore: 0-100, suggestions: [...] }

Final output combines all stages with pipeline metadata (timing, token costs per stage).`,
    skills: [
      {
        name: "content-style-guide",
        content: `<skill name="content-style-guide">
Content Style Guide:

Voice & Tone:
- Professional but approachable — write like a knowledgeable friend
- Use active voice (90%+ of sentences)
- Address the reader as "you" — second person perspective
- Avoid jargon unless writing for a technical audience (then define on first use)

Structure:
- Hook: open with a surprising statistic, question, or bold claim (1-2 sentences)
- Introduction: context + what the reader will learn (1 paragraph)
- Body: 4-7 H2 sections, each with a clear takeaway
- Use H3 for sub-points within complex sections
- Include at least 3 data points or citations per article
- End each section with a transition to the next
- Conclusion: summarize key points + clear call-to-action

Formatting:
- Paragraphs: 2-4 sentences max
- Use bullet lists for 3+ related items
- Bold key terms on first appearance
- Include 1-2 pull quotes or callout boxes per article
- Target word count: 1500-2500 words
</skill>`,
      },
      {
        name: "seo-checklist",
        content: `<skill name="seo-checklist">
SEO Optimization Checklist:

On-Page Essentials:
- [ ] Primary keyword in title (first 60 chars)
- [ ] Primary keyword in first 100 words of body
- [ ] Primary keyword in at least 2 H2 headings
- [ ] Keyword density: 1-2% (not stuffing)
- [ ] Meta title: <60 characters, includes primary keyword
- [ ] Meta description: 120-155 characters, includes CTA + keyword
- [ ] URL slug: short, hyphenated, includes keyword

Content Quality Signals:
- [ ] Word count: 1500+ words for pillar content
- [ ] Flesch reading ease: 60-70 (accessible to general audience)
- [ ] At least 3 external links to authoritative sources (DA 50+)
- [ ] At least 2 internal links to related content
- [ ] Image alt text includes keyword variation
- [ ] No orphan pages — linked from at least 1 hub page

Technical:
- [ ] H1 tag used once (title only)
- [ ] Logical H2 → H3 hierarchy (no skipped levels)
- [ ] No duplicate meta descriptions across site
- [ ] Schema markup: Article type with author, datePublished
</skill>`,
      },
    ],
    tools: [
      {
        name: "search_sources",
        description: "Searches multiple content sources for research material on a given topic",
        params: `{ "query": { "type": "string" }, "sources": { "type": "array", "items": { "type": "string", "enum": ["google_scholar", "news", "blogs", "reddit", "arxiv"] }, "default": ["google_scholar", "news", "blogs"] }, "maxResults": { "type": "number", "default": 10 }, "dateRange": { "type": "string", "enum": ["last_week", "last_month", "last_year", "all_time"], "default": "last_year" } }`,
        executeCode: "const query = args.query || '';\nconst sources = args.sources || [];\nconst maxResults = args.maxResults || 10;\nconst dateRange = args.dateRange || '';\nconst queryWords = query.toLowerCase().split(/\\s+/).filter(w => w.length > 2);\nconst stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'from', 'been', 'with', 'this', 'that', 'they', 'will', 'each', 'make', 'how', 'what', 'when', 'where', 'which', 'their']);\nconst keywords = queryWords.filter(w => !stopWords.has(w));\nif (sources.length === 0) {\n  result = JSON.stringify({\n    status: 'external_data_required',\n    query, keywords, maxResults, dateRange,\n    instruction: 'Provide source documents as an array of {title, content, url?, date?, source?, tags?} objects.',\n    searchStrategy: 'Keyword relevance scoring with TF weighting'\n  });\n} else {\n  const scored = sources.map(doc => {\n    const text = ((doc.title || '') + ' ' + (doc.content || '') + ' ' + (doc.tags || []).join(' ')).toLowerCase();\n    let score = 0;\n    for (const kw of keywords) {\n      const matches = (text.match(new RegExp(kw, 'gi')) || []).length;\n      score += matches;\n      if ((doc.title || '').toLowerCase().includes(kw)) score += 3;\n    }\n    return { ...doc, relevanceScore: score };\n  }).filter(d => d.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, maxResults);\n  result = JSON.stringify({ query, keywords, totalSources: sources.length, resultsFound: scored.length, results: scored });\n}",
      },
      {
        name: "analyze_seo",
        description: "Analyzes content for SEO metrics including keyword density, readability, and optimization score",
        params: `{ "content": { "type": "string" }, "primaryKeyword": { "type": "string" }, "secondaryKeywords": { "type": "array", "items": { "type": "string" } }, "targetUrl": { "type": "string" }, "competitorUrls": { "type": "array", "items": { "type": "string" } } }`,
        executeCode: "const content = args.content || '';\nconst primary = args.primaryKeyword || '';\nconst secondary = args.secondaryKeywords || [];\nconst targetUrl = args.targetUrl || '';\nconst words = content.split(/\\s+/).filter(w => w.length > 0);\nconst wordCount = words.length;\nconst sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);\nconst avgSentenceLen = sentences.length > 0 ? Math.round(words.length / sentences.length * 10) / 10 : 0;\nconst paragraphs = content.split(/\\n\\n+/).filter(p => p.trim().length > 0);\nconst headings = (content.match(/^#{1,6}\\s.+$/gm) || []);\nconst lower = content.toLowerCase();\nconst primaryCount = primary ? (lower.match(new RegExp(primary.toLowerCase().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi')) || []).length : 0;\nconst primaryDensity = primary && wordCount > 0 ? Math.round(primaryCount / wordCount * 10000) / 100 : 0;\nconst secondaryAnalysis = secondary.map(kw => {\n  const count = (lower.match(new RegExp(kw.toLowerCase().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi')) || []).length;\n  return { keyword: kw, count, density: Math.round(count / wordCount * 10000) / 100 };\n});\nconst issues = []; const suggestions = [];\nif (wordCount < 300) issues.push('Content too short (< 300 words). Aim for 1000+ for SEO.');\nif (wordCount > 3000) suggestions.push('Consider breaking into multiple pages for very long content.');\nif (primaryDensity < 0.5) issues.push('Primary keyword density too low (' + primaryDensity + '%). Aim for 1-2%.');\nif (primaryDensity > 3) issues.push('Primary keyword density too high (' + primaryDensity + '%). Risk of keyword stuffing.');\nif (headings.length === 0) issues.push('No headings found. Add H1-H3 for structure.');\nif (avgSentenceLen > 25) suggestions.push('Average sentence length is high (' + avgSentenceLen + '). Consider shorter sentences.');\nconst first100 = content.slice(0, 500).toLowerCase();\nif (primary && !first100.includes(primary.toLowerCase())) suggestions.push('Primary keyword not found in first 500 characters.');\nconst readabilityScore = Math.max(0, Math.min(100, 100 - (avgSentenceLen - 15) * 2 - Math.max(0, (wordCount - 2000) / 100)));\nconst seoScore = Math.max(0, Math.min(100, 100 - issues.length * 15 - suggestions.length * 5));\nresult = JSON.stringify({ wordCount, sentenceCount: sentences.length, paragraphCount: paragraphs.length, headingCount: headings.length, avgSentenceLength: avgSentenceLen, primaryKeyword: { keyword: primary, count: primaryCount, density: primaryDensity }, secondaryKeywords: secondaryAnalysis, readabilityScore, seoScore, issues, suggestions, headings: headings.map(h => h.trim()) });",
      },
    ],
    mcpIntegration: `Content team submits topic + target keyword via form.
POST to /api/mcp triggers the 3-stage pipeline.
Each stage streams progress via SSE events.
Final optimized article returned for human review before publishing.
Pipeline metadata (timing, cost per stage) logged for optimization.`,
    gradingSuite: [
      {
        caseName: "Full pipeline produces SEO-optimized article",
        input: `Topic: "Microservices vs Monolith in 2026". Primary keyword: "microservices architecture". Target audience: CTOs and tech leads.`,
        criteria: `- output_match: research stage returns 5+ sources with key facts (weight: 0.25)
- output_match: article has proper H2/H3 structure with 1500+ words (weight: 0.25)
- output_match: SEO score >= 80 with meta title and description (weight: 0.25)
- output_match: pipeline includes timing metadata for all 3 stages (weight: 0.25)`,
      },
      {
        caseName: "Pipeline handles thin research gracefully",
        input: `Topic: "Quantum-resistant API authentication patterns". Primary keyword: "post-quantum API security". Target audience: security engineers.`,
        criteria: `- output_match: research stage flags limited sources and adjusts expectations (weight: 0.3)
- output_match: article clearly states emerging/evolving nature of the topic (weight: 0.3)
- output_match: SEO agent adapts keyword strategy for low-volume keyword (weight: 0.2)
- output_match: content includes appropriate caveats about nascent technology (weight: 0.2)`,
      },
    ],
  },

  // 18. Meta-Agent: AI Agent Architect
  {
    slug: "meta-agent-builder",
    title: "Meta-Agent: AI Agent Architect",
    domain: "Meta-Agent / Platform",
    icon: Sparkles,
    tagline: "Describe what you need in plain language and get a fully configured agent",
    description:
      "An AI agent that builds other agents. Describe your use case in plain language and it generates the complete agent configuration: system prompt, skills (with content), tools (with JSON Schema params), grading suite, and MCP integration instructions. Validates the spec for internal consistency and suggests improvements based on agent design best practices.",
    timeSaved: "2-4 hours of agent configuration reduced to a 5-minute conversation",
    costReduction: "Enables non-technical users to build agents ($0 training cost)",
    riskMitigation: "Generated configs follow proven patterns, reducing misconfiguration by 85%",
    systemPrompt: `You are a meta-agent that designs and builds AI agent configurations for the Kopern platform.

Process:
1. UNDERSTAND: Ask clarifying questions about the user's use case, domain, and constraints
2. DESIGN: Choose the right architecture pattern (single agent, pipeline, team, router)
3. BUILD: Generate the complete agent configuration:
   - systemPrompt: detailed, with clear rules, output format, and safety guardrails
   - skills: 2-4 markdown skill files with domain knowledge
   - tools: 1-3 tools with JSON Schema params and clear descriptions
   - gradingSuite: 2-3 test cases covering happy path + edge cases
   - mcpIntegration: integration instructions for the user's workflow

4. VALIDATE: Check for:
   - Prompt-tool consistency (tools referenced in prompt actually exist)
   - Skill coverage (no domain knowledge gaps)
   - Grading completeness (tests cover all critical behaviors)
   - Security (no prompt injection vectors, proper input validation)

5. ITERATE: Present the config, explain design choices, offer refinements

Output the config as a valid JSON object matching the Kopern UseCase interface:
{
  slug: string,
  title: string,
  domain: string,
  systemPrompt: string,
  skills: [{ name: string, content: string }],
  tools: [{ name: string, description: string, params: string }],
  gradingSuite: [{ caseName: string, input: string, criteria: string }],
  mcpIntegration: string
}

Always explain WHY you made each design choice.`,
    skills: [
      {
        name: "kopern-architecture-guide",
        content: `<skill name="kopern-architecture-guide">
Kopern Platform Architecture Guide:

Agent Types:
1. Single Agent — one prompt, tools, skills. Best for focused tasks (review, classify, generate).
2. Pipeline — sequential stages (A → B → C). Best when each stage transforms the output. Each stage is an independent agent with its own prompt.
3. Team — parallel agents + coordinator. Best when multiple perspectives are needed simultaneously.
4. Router — conditional delegation. A triage agent picks the right specialist based on input.

Component Design Rules:
- System Prompt: 200-500 words. Include: role, rules, output format, safety constraints.
- Skills: domain knowledge injected as XML blocks. Keep each under 300 words. Focus on facts/rules, not instructions.
- Tools: each tool does ONE thing. Params should be strongly typed with enums where possible.
- Grading Suite: minimum 2 cases — one happy path, one edge case. Use weighted criteria summing to 1.0.

MCP Integration:
- All agents are accessible via POST /api/mcp (JSON-RPC 2.0)
- Auth: Bearer token with kpn_ prefix
- Streaming: SSE for long-running agents
- Webhooks: trigger agents from external events (GitHub, Slack, CI)
</skill>`,
      },
      {
        name: "agent-design-patterns",
        content: `<skill name="agent-design-patterns">
Agent Design Patterns & Anti-Patterns:

PATTERNS (use these):
- Deterministic Shell: 67-91% of workflow is code, LLM only for ambiguous reasoning
- Grader Gates: every LLM output passes through deterministic validators before downstream use
- Context Injection: use skills to inject domain knowledge rather than cramming into the prompt
- Fail-Safe Defaults: if LLM is uncertain, output a safe default + flag for human review
- Scoped Tools: tools have narrow permissions and validate inputs against schema

ANTI-PATTERNS (avoid these):
- God Prompt: trying to encode all behavior in one massive system prompt (>1000 words)
- Tool Explosion: exposing 10+ tools to a single agent (causes selection confusion)
- Missing Guardrails: no output validation, no safety checks, no grading suite
- Implicit Knowledge: assuming the LLM knows domain-specific rules without skill injection
- Unbounded Loops: agent can call tools indefinitely without a max-iteration check

Prompt Engineering Tips:
- Start with role ("You are a...") then context, then rules, then output format
- Use numbered lists for sequential steps
- Use "Never..." for hard constraints
- Include an example output when the format is complex
- End with the most important instruction (recency bias)
</skill>`,
      },
    ],
    tools: [
      {
        name: "create_agent_config",
        description: "Generates a complete agent configuration from a natural language description of the use case",
        params: `{ "description": { "type": "string", "description": "Natural language description of the desired agent" }, "domain": { "type": "string", "description": "Business domain (e.g., DevOps, Marketing, Finance)" }, "complexity": { "type": "string", "enum": ["single", "pipeline", "team", "router"], "default": "single" }, "constraints": { "type": "object", "properties": { "maxTools": { "type": "number", "default": 3 }, "maxSkills": { "type": "number", "default": 4 }, "requireGrading": { "type": "boolean", "default": true } } } }`,
        executeCode: "const desc = args.description || '';\nconst domain = args.domain || 'general';\nconst complexity = args.complexity || 'medium';\nconst constraints = args.constraints || {};\nconst maxTools = constraints.maxTools || (complexity === 'simple' ? 3 : complexity === 'complex' ? 10 : 5);\nconst maxSkills = constraints.maxSkills || (complexity === 'simple' ? 2 : complexity === 'complex' ? 6 : 3);\nconst domainTemplates = {\n  'coding': { suggestedModel: 'claude-sonnet-4-20250514', suggestedTools: ['read_file', 'search_files', 'github_write'], suggestedSkills: ['code_review', 'refactoring', 'testing'], systemPromptPrefix: 'You are an expert software engineer.' },\n  'customer_support': { suggestedModel: 'claude-sonnet-4-20250514', suggestedTools: ['search_docs', 'check_known_issues'], suggestedSkills: ['empathetic_response', 'escalation', 'troubleshooting'], systemPromptPrefix: 'You are a helpful customer support agent.' },\n  'data_analysis': { suggestedModel: 'claude-sonnet-4-20250514', suggestedTools: ['parse_financial_report', 'compute_psi'], suggestedSkills: ['data_interpretation', 'visualization_guidance', 'statistical_analysis'], systemPromptPrefix: 'You are a data analyst specializing in insights.' },\n  'devops': { suggestedModel: 'claude-sonnet-4-20250514', suggestedTools: ['parse_alert_timeline', 'execute_runbook', 'query_metrics'], suggestedSkills: ['incident_response', 'monitoring', 'automation'], systemPromptPrefix: 'You are a DevOps/SRE engineer.' },\n  'general': { suggestedModel: 'claude-sonnet-4-20250514', suggestedTools: [], suggestedSkills: ['task_planning', 'research'], systemPromptPrefix: 'You are a helpful AI assistant.' }\n};\nconst template = domainTemplates[domain] || domainTemplates['general'];\nconst config = {\n  name: desc.split(' ').slice(0, 4).join(' ') || domain + ' Agent',\n  description: desc,\n  domain,\n  complexity,\n  model: constraints.model || template.suggestedModel,\n  systemPrompt: (constraints.systemPromptOverride || template.systemPromptPrefix) + '\\n\\n' + desc,\n  suggestedTools: template.suggestedTools.slice(0, maxTools),\n  suggestedSkills: template.suggestedSkills.slice(0, maxSkills),\n  settings: {\n    temperature: complexity === 'simple' ? 0.3 : complexity === 'complex' ? 0.7 : 0.5,\n    maxTokens: complexity === 'simple' ? 1024 : complexity === 'complex' ? 4096 : 2048,\n    purposeGate: true,\n    tillDone: complexity === 'complex'\n  },\n  constraints\n};\nresult = JSON.stringify(config);",
      },
      {
        name: "validate_agent_spec",
        description: "Validates an agent configuration for internal consistency, security, and completeness",
        params: `{ "config": { "type": "object", "description": "The agent configuration to validate" }, "checks": { "type": "array", "items": { "type": "string", "enum": ["prompt_tool_consistency", "skill_coverage", "grading_completeness", "security_audit", "output_format_validity"] }, "default": ["prompt_tool_consistency", "skill_coverage", "grading_completeness", "security_audit"] } }`,
        executeCode: "const config = args.config || {};\nconst checks = args.checks || ['required_fields', 'model_validity', 'prompt_quality', 'tool_config'];\nconst errors = []; const warnings = []; const passed = [];\nif (checks.includes('required_fields')) {\n  const required = ['name', 'description', 'systemPrompt'];\n  for (const field of required) {\n    if (!config[field]) errors.push({ check: 'required_fields', field, message: field + ' is required' });\n    else passed.push('required_fields:' + field);\n  }\n}\nif (checks.includes('model_validity')) {\n  const validModels = ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-35-20241022', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gemini-2.5-pro', 'gemini-2.5-flash'];\n  if (config.model && !validModels.includes(config.model)) warnings.push({ check: 'model_validity', message: 'Model \"' + config.model + '\" not in known list. Verify it exists.' });\n  else if (config.model) passed.push('model_validity');\n}\nif (checks.includes('prompt_quality')) {\n  const prompt = config.systemPrompt || '';\n  if (prompt.length < 50) warnings.push({ check: 'prompt_quality', message: 'System prompt is very short (' + prompt.length + ' chars). Consider adding more context.' });\n  if (prompt.length > 10000) warnings.push({ check: 'prompt_quality', message: 'System prompt is very long (' + prompt.length + ' chars). Consider using skills for detailed instructions.' });\n  if (!/you are|your role|as a/i.test(prompt)) warnings.push({ check: 'prompt_quality', message: 'System prompt lacks role definition. Start with \"You are...\"' });\n  if (prompt.length >= 50) passed.push('prompt_quality:length');\n}\nif (checks.includes('tool_config')) {\n  const tools = config.tools || config.suggestedTools || [];\n  if (tools.length > 15) warnings.push({ check: 'tool_config', message: 'Too many tools (' + tools.length + '). Consider reducing to avoid context bloat.' });\n  if (tools.length === 0 && config.complexity === 'complex') warnings.push({ check: 'tool_config', message: 'Complex agent has no tools configured.' });\n  passed.push('tool_config');\n}\nconst valid = errors.length === 0;\nresult = JSON.stringify({ valid, errors, warnings, passed, checksRun: checks, score: Math.max(0, 100 - errors.length * 25 - warnings.length * 10) });",
      },
    ],
    mcpIntegration: `User describes their agent need in natural language via the Kopern UI.
POST description to /api/mcp.
Meta-agent asks clarifying questions (streamed via SSE).
Generates full agent config and validates it.
Config is importable directly into Kopern as a new agent.`,
    gradingSuite: [
      {
        caseName: "Generate agent from simple description",
        input: `"I need an agent that reads customer support emails and classifies them by urgency (low/medium/high/critical) and department (billing, technical, general). It should work with our Zendesk webhook."`,
        criteria: `- output_match: generates systemPrompt with classification rules and output format (weight: 0.3)
- output_match: includes at least 1 skill with classification criteria (weight: 0.2)
- output_match: includes a tool for fetching email content (weight: 0.2)
- output_match: grading suite tests both urgency and department classification (weight: 0.2)
- schema_validation: output matches Kopern UseCase interface (weight: 0.1)`,
      },
      {
        caseName: "Detect and fix anti-patterns in user request",
        input: `"Build me an agent with 15 tools that can do everything: code review, write docs, deploy to AWS, manage Jira tickets, send Slack messages, and analyze metrics. Put all the instructions in one big prompt."`,
        criteria: `- output_match: recommends splitting into multiple agents or a pipeline/team (weight: 0.3)
- output_match: warns about tool explosion anti-pattern (weight: 0.2)
- output_match: warns about god prompt anti-pattern (weight: 0.2)
- output_match: suggests a scoped alternative architecture (weight: 0.2)
- output_match: explains why the suggested approach is better (weight: 0.1)`,
      },
    ],
  },

  // 19. Incident Response Squad
  {
    slug: "multi-agent-incident-response",
    title: "Incident Response Squad",
    domain: "Multi-Agent / SRE",
    icon: GitMerge,
    tagline: "Router agent triages alerts to the right specialist, who diagnoses and fixes while a comms agent updates stakeholders",
    description:
      "Conditional team execution for incident response. A router agent reads incoming alerts and classifies the incident type (database, network, application, security). The appropriate specialist agent diagnoses the issue using runbooks and metrics, then proposes a fix. A communication agent drafts status page updates and stakeholder notifications throughout the process.",
    timeSaved: "15-30 min of initial triage + 30-60 min of status communication per incident",
    costReduction: "~$120K/year for a 5-person on-call rotation (faster MTTR, less toil)",
    riskMitigation: "Reduces MTTR by 65% with automated triage and parallel diagnosis + communication",
    systemPrompt: `You are an incident response router agent. Your job is to triage incoming alerts, delegate to the right specialist, and coordinate communication.

Workflow:
1. TRIAGE: Analyze the alert payload (source, severity, affected service, error patterns)
2. CLASSIFY: Determine incident type:
   - database: connection pool exhaustion, replication lag, deadlocks, disk space
   - network: DNS failures, certificate expiry, load balancer errors, latency spikes
   - application: OOM kills, crash loops, error rate spikes, deployment failures
   - security: unauthorized access, DDoS, data exfiltration, CVE exploitation
3. ROUTE: Delegate to the matching specialist agent with full alert context
4. COMMUNICATE: In parallel, activate the communication agent to begin drafting status updates
5. SYNTHESIZE: Combine specialist diagnosis + proposed fix into an incident report

Severity Levels:
- SEV1 (critical): revenue-impacting, >50% users affected → page all on-call + VP Eng
- SEV2 (high): degraded service, >10% users affected → page primary on-call
- SEV3 (medium): non-critical service degraded → notify #incidents channel
- SEV4 (low): cosmetic or monitoring false positive → log and auto-resolve

Output JSON:
{
  "incidentId": string,
  "severity": "SEV1" | "SEV2" | "SEV3" | "SEV4",
  "type": "database" | "network" | "application" | "security",
  "rootCause": string,
  "diagnosis": { "specialist": string, "findings": [...], "confidence": number },
  "proposedFix": { "steps": [...], "estimatedTime": string, "riskLevel": string },
  "statusUpdate": { "external": string, "internal": string },
  "timeline": [{ "timestamp": string, "event": string }]
}

Never auto-execute fixes for SEV1 incidents — always require human approval.`,
    skills: [
      {
        name: "runbook-library",
        content: `<skill name="runbook-library">
Incident Runbook Library:

DATABASE:
- Connection pool exhaustion:
  1. Check current connections: SELECT count(*) FROM pg_stat_activity
  2. Identify long-running queries: SELECT * FROM pg_stat_activity WHERE state != 'idle' AND query_start < now() - interval '5 min'
  3. Kill stuck connections if safe: SELECT pg_terminate_backend(pid)
  4. Scale connection pool if recurring (PgBouncer max_client_conn)

- Replication lag > 30s:
  1. Check WAL sender status: SELECT * FROM pg_stat_replication
  2. Verify network between primary and replica
  3. Check disk I/O on replica (iostat -x 1)
  4. If persistent: failover to standby, rebuild lagging replica

NETWORK:
- Certificate expiry:
  1. Check cert: openssl s_client -connect host:443 | openssl x509 -noout -dates
  2. Renew via cert-manager or manual renewal
  3. Verify renewal: curl -vI https://host

APPLICATION:
- OOM Kill:
  1. Check: dmesg | grep -i "out of memory"
  2. Review memory limits in k8s: kubectl describe pod
  3. Heap dump analysis if Java/Node
  4. Increase limits or fix memory leak

SECURITY:
- Unauthorized access:
  1. Identify source IP and affected accounts
  2. Block IP at WAF level immediately
  3. Force password reset for affected accounts
  4. Check audit logs for data access
</skill>`,
      },
      {
        name: "communication-templates",
        content: `<skill name="communication-templates">
Incident Communication Templates:

EXTERNAL STATUS PAGE (customer-facing):
---
**[Investigating/Identified/Monitoring/Resolved] - [Service Name]**

We are currently investigating [brief description of impact].

Affected services: [list]
Impact: [percentage of users, specific functionality]
Started: [timestamp UTC]

We will provide updates every [15/30/60] minutes.

Next update by: [timestamp UTC]
---

INTERNAL SLACK (#incidents):
---
🚨 **[SEV level] - [Service] - [One-line summary]**

**Alert source:** [PagerDuty/Datadog/CloudWatch]
**Impact:** [user-facing description]
**Assigned to:** [specialist type]
**Current status:** [Triaging/Diagnosing/Fixing/Verifying]

**Timeline:**
- HH:MM UTC — Alert received
- HH:MM UTC — Triaged as [type], routed to [specialist]
- HH:MM UTC — [Latest update]

**Next steps:** [what's happening now]
---

EXECUTIVE SUMMARY (post-resolution):
---
**Incident #[ID] — [Title]**
Duration: [X minutes/hours]
Severity: [SEV level]
Root cause: [1-2 sentences]
Fix applied: [1-2 sentences]
Action items: [numbered list]
---
</skill>`,
      },
    ],
    tools: [
      {
        name: "query_metrics",
        description: "Queries monitoring systems for real-time metrics related to the incident",
        params: `{ "source": { "type": "string", "enum": ["datadog", "cloudwatch", "prometheus", "pagerduty"] }, "query": { "type": "string", "description": "Metric query (e.g., 'avg:system.cpu.user{service:api} last_15m')" }, "timeRange": { "type": "object", "properties": { "start": { "type": "string" }, "end": { "type": "string" } } }, "aggregation": { "type": "string", "enum": ["avg", "max", "min", "sum", "count"], "default": "avg" } }`,
        executeCode: "const source = args.source || '';\nconst query = args.query || '';\nconst timeRange = args.timeRange || {};\nconst aggregation = args.aggregation || 'avg';\nresult = JSON.stringify({\n  status: 'external_data_required',\n  source: source,\n  query: query,\n  timeRange: timeRange,\n  aggregation: aggregation,\n  instruction: 'Provide metric data as an array of {timestamp, value, labels?} objects. This tool will compute the requested aggregation.',\n  supportedAggregations: ['avg', 'sum', 'min', 'max', 'p50', 'p95', 'p99', 'count', 'rate'],\n  queryExamples: {\n    prometheus: 'rate(http_requests_total{status=\"500\"}[5m])',\n    datadog: 'avg:system.cpu.user{host:web-*}',\n    cloudwatch: 'AWS/EC2 CPUUtilization'\n  },\n  tip: 'If you have the raw data, provide it directly and specify the aggregation type.'\n});",
      },
      {
        name: "execute_runbook",
        description: "Executes a predefined runbook step in the target environment (requires approval for SEV1)",
        params: `{ "runbookId": { "type": "string", "description": "ID of the runbook to execute (e.g., 'db_kill_connections')" }, "stepIndex": { "type": "number", "description": "Which step to execute (0-indexed)" }, "targetEnvironment": { "type": "string", "enum": ["production", "staging"] }, "dryRun": { "type": "boolean", "default": true, "description": "If true, simulate the step without applying changes" }, "approvedBy": { "type": "string", "description": "Required for production SEV1 — email of approver" } }`,
        executeCode: "const runbookId = args.runbookId || '';\nconst stepIndex = args.stepIndex !== undefined ? args.stepIndex : 0;\nconst targetEnv = args.targetEnvironment || 'staging';\nconst dryRun = args.dryRun !== undefined ? args.dryRun : true;\nconst approvedBy = args.approvedBy || '';\nconst safetyChecks = [];\nif (targetEnv === 'production' && !approvedBy) safetyChecks.push({ check: 'approval_required', passed: false, message: 'Production execution requires approvedBy field' });\nif (targetEnv === 'production' && dryRun === false) safetyChecks.push({ check: 'production_warning', passed: true, message: 'WARNING: This will execute against production' });\nif (!runbookId) safetyChecks.push({ check: 'runbook_exists', passed: false, message: 'runbookId is required' });\nconst blocked = safetyChecks.some(c => !c.passed);\nresult = JSON.stringify({\n  status: blocked ? 'blocked' : 'ready_for_execution',\n  runbookId, stepIndex, targetEnvironment: targetEnv, dryRun, approvedBy,\n  safetyChecks,\n  message: blocked ? 'Execution blocked by safety checks. Resolve issues before proceeding.' : dryRun ? 'Dry run mode - no changes will be made. Set dryRun=false to execute.' : 'Ready for execution. Provide the runbook steps and this tool will validate and track execution.',\n  instruction: 'This tool validates execution safety. Provide runbook content as {steps: [{action, command, expected, rollback}]} to execute a specific step.',\n  auditTrail: { timestamp: new Date().toISOString(), runbookId, step: stepIndex, environment: targetEnv, dryRun, approvedBy, status: blocked ? 'blocked' : 'validated' }\n});",
      },
    ],
    mcpIntegration: `Alert webhook (PagerDuty/Datadog) sends payload to /api/mcp.
Router agent triages and delegates to specialist in <5 seconds.
Communication agent streams status updates via SSE.
Specialist diagnosis and proposed fix returned within 60 seconds.
Human approves fix for SEV1; auto-applied for SEV3/SEV4.
Full incident timeline logged for post-mortem generation.`,
    gradingSuite: [
      {
        caseName: "Triage database connection pool alert",
        input: `Alert: "PostgreSQL connection pool exhausted on prod-db-01. Active connections: 500/500. Service: payment-api. Error rate spike: 45% of requests returning 500. Started: 2 minutes ago."`,
        criteria: `- output_match: classifies as "database" type (weight: 0.2)
- output_match: severity is SEV1 or SEV2 (revenue-impacting payment service) (weight: 0.2)
- output_match: routes to database specialist with connection pool runbook (weight: 0.2)
- output_match: communication agent drafts status update mentioning payment impact (weight: 0.2)
- output_match: proposed fix includes killing long-running queries + pool scaling (weight: 0.2)`,
      },
      {
        caseName: "Route security incident with communication",
        input: `Alert: "Unusual login pattern detected. 150 failed login attempts from IP 203.0.113.42 in 5 minutes targeting admin endpoints. 3 successful logins from same IP to different accounts. GeoIP: unexpected region."`,
        criteria: `- output_match: classifies as "security" type with SEV1 severity (weight: 0.25)
- output_match: proposes immediate IP block at WAF (weight: 0.25)
- output_match: proposes forced password reset for compromised accounts (weight: 0.25)
- output_match: communication includes internal alert to security team + external notice if data accessed (weight: 0.25)`,
      },
    ],
  },

  // 20. Observable Data Pipeline
  {
    slug: "orchestrated-data-pipeline",
    title: "Observable Data Pipeline",
    domain: "Pipeline / Observability",
    icon: Eye,
    tagline: "A fully traced ETL pipeline with token cost tracking, error handling, and quality validation at every step",
    description:
      "A pipeline with full observability across 4 stages: Extract (pull data from sources), Transform (clean, normalize, enrich), Validate (data quality checks), and Load (write to destination). Every step emits structured session events with timing, token costs, and error tracking. Built-in data quality rules catch schema violations, null rates, and distribution anomalies before loading.",
    timeSaved: "3-8 hours of manual ETL debugging reduced to instant root-cause identification",
    costReduction: "~$50K/year in data engineering time + prevents $200K+ in bad-data downstream costs",
    riskMitigation: "99.5% data quality with pre-load validation — zero silent data corruption",
    systemPrompt: `You are a data pipeline orchestrator with full observability. Manage a 4-stage ETL pipeline where every step is traced.

Pipeline Stages:
1. EXTRACT: Pull data from configured sources (APIs, databases, file stores)
   - Emit event: { stage: "extract", status: "start|success|error", source: string, recordCount: number, durationMs: number }
   - Handle pagination, rate limiting, retries (max 3, exponential backoff)

2. TRANSFORM: Clean, normalize, and enrich the extracted data
   - Apply transformation rules from the data-quality-rules skill
   - Emit event: { stage: "transform", transformations: [...], recordsIn: number, recordsOut: number, droppedRecords: number, tokenCost: number }
   - Track every LLM call cost (token in/out) for transformation steps

3. VALIDATE: Run quality checks before loading
   - Schema validation: all required fields present, correct types
   - Null rate check: flag columns with >5% nulls
   - Distribution check: detect outliers (>3 std deviations from mean)
   - Referential integrity: foreign keys resolve
   - Emit event: { stage: "validate", passed: boolean, checks: [...], failedRecords: number }

4. LOAD: Write validated data to destination
   - Batch insert with transaction safety
   - Emit event: { stage: "load", destination: string, recordsLoaded: number, durationMs: number }

Final output:
{
  "pipelineId": string,
  "status": "success" | "partial" | "failed",
  "stages": [{ stage: string, status: string, durationMs: number, tokenCost: number, events: [...] }],
  "qualityReport": { "totalRecords": number, "validRecords": number, "qualityScore": number },
  "totalCost": { "tokens": number, "estimatedUsd": number },
  "errors": [{ "stage": string, "message": string, "recordId": string }]
}

Never load data that fails validation. Always emit events — observability is non-negotiable.`,
    skills: [
      {
        name: "data-quality-rules",
        content: `<skill name="data-quality-rules">
Data Quality Rules Engine:

SCHEMA RULES:
- Every record must match the declared schema (field names, types, constraints)
- Required fields with null values → reject record, log reason
- Type coercion allowed for: string→number (if parseable), ISO date strings→Date
- Unknown fields: warn but allow (forward compatibility)

NULL RATE THRESHOLDS:
- Critical fields (IDs, timestamps): 0% nulls allowed
- Important fields (names, amounts): <2% nulls
- Optional fields: <10% nulls
- Above threshold → pipeline pauses, alerts data team

DISTRIBUTION CHECKS:
- Numeric columns: flag values > 3 standard deviations from rolling 30-day mean
- Categorical columns: flag new categories not seen in last 90 days
- Date columns: flag records with future dates or dates > 1 year old
- Volume: flag if record count deviates >20% from same-day-last-week

DEDUPLICATION:
- Primary key duplicates: keep latest by timestamp, log dropped record
- Fuzzy duplicates: flag for human review (don't auto-deduplicate)

FRESHNESS:
- Data older than configured SLA (default: 1 hour) triggers stale data warning
- Pipeline run time > 2x historical average triggers performance alert
</skill>`,
      },
      {
        name: "etl-patterns",
        content: `<skill name="etl-patterns">
ETL Best Practices & Patterns:

EXTRACTION PATTERNS:
- Incremental: only pull records changed since last run (use watermark/cursor)
- Full refresh: pull everything, compare with existing, apply delta
- CDC (Change Data Capture): stream changes in real-time from source DB binlog
- Always prefer incremental — full refresh is 10-100x more expensive

TRANSFORMATION PATTERNS:
- Idempotent: running the same transform twice produces the same result
- Immutable staging: write raw data first, transform in a separate step
- Schema-on-read: store raw, validate on query (flexible but risky)
- Schema-on-write: validate before storing (strict, recommended for this pipeline)

ERROR HANDLING:
- Dead letter queue: failed records go to a separate store for manual review
- Circuit breaker: if error rate > 10% in a batch, halt pipeline and alert
- Partial success: load valid records, quarantine invalid ones, report both counts

OBSERVABILITY:
- Every stage emits structured events (not just logs)
- Track: duration, record counts (in/out/dropped), token costs, error details
- Pipeline-level metrics: total duration, overall quality score, cost per record
- Alerting: Slack/PagerDuty on failure, daily digest on success with quality trends
</skill>`,
      },
    ],
    tools: [
      {
        name: "fetch_data_source",
        description: "Extracts data from a configured source with pagination and retry support",
        params: `{ "sourceId": { "type": "string", "description": "Registered data source identifier" }, "sourceType": { "type": "string", "enum": ["rest_api", "database", "s3", "gcs", "sftp"] }, "query": { "type": "object", "properties": { "endpoint": { "type": "string" }, "filters": { "type": "object" }, "cursor": { "type": "string" }, "limit": { "type": "number", "default": 1000 } } }, "retryConfig": { "type": "object", "properties": { "maxRetries": { "type": "number", "default": 3 }, "backoffMs": { "type": "number", "default": 1000 } } } }`,
        executeCode: "const sourceId = args.sourceId || '';\nconst sourceType = args.sourceType || '';\nconst query = args.query || {};\nconst retryConfig = args.retryConfig || { maxRetries: 3, backoffMs: 1000 };\nresult = JSON.stringify({\n  status: 'external_data_required',\n  sourceId, sourceType, query, retryConfig,\n  instruction: 'Provide the data directly. This tool validates the query structure and would connect to the source if network access were available.',\n  supportedTypes: {\n    'postgres': { queryFormat: 'SQL string', example: { sql: 'SELECT * FROM users WHERE created_at > $1', params: ['2024-01-01'] } },\n    'mongodb': { queryFormat: 'MongoDB filter object', example: { collection: 'users', filter: { status: 'active' }, projection: { name: 1, email: 1 } } },\n    'rest_api': { queryFormat: 'HTTP request config', example: { method: 'GET', path: '/api/data', headers: {}, queryParams: {} } },\n    'csv': { queryFormat: 'File path or content', example: { filePath: '/data/export.csv', delimiter: ',' } },\n    'elasticsearch': { queryFormat: 'ES query DSL', example: { index: 'logs-*', body: { query: { match: { level: 'error' } } } } }\n  },\n  validationResult: {\n    sourceIdProvided: !!sourceId,\n    sourceTypeValid: ['postgres', 'mongodb', 'rest_api', 'csv', 'elasticsearch', 's3', 'bigquery'].includes(sourceType),\n    queryProvided: Object.keys(query).length > 0\n  }\n});",
      },
      {
        name: "validate_schema",
        description: "Validates a batch of records against a JSON Schema and returns quality metrics",
        params: `{ "records": { "type": "array", "items": { "type": "object" } }, "schema": { "type": "object", "description": "JSON Schema to validate against" }, "rules": { "type": "object", "properties": { "maxNullRate": { "type": "number", "default": 0.05 }, "checkDistribution": { "type": "boolean", "default": true }, "checkReferentialIntegrity": { "type": "boolean", "default": false }, "historicalStats": { "type": "object", "description": "Mean/stddev from previous runs for anomaly detection" } } } }`,
        executeCode: "const records = args.records || [];\nconst schema = args.schema || {};\nconst rules = args.rules || {};\nconst results = [];\nconst requiredFields = schema.required || [];\nconst properties = schema.properties || {};\nconst maxErrors = rules.maxErrors || 100;\nlet errorCount = 0;\nfor (let i = 0; i < records.length && errorCount < maxErrors; i++) {\n  const record = records[i];\n  const recordErrors = [];\n  for (const field of requiredFields) {\n    if (record[field] === undefined || record[field] === null || record[field] === '') {\n      recordErrors.push({ field, error: 'required', message: 'Missing required field: ' + field });\n    }\n  }\n  for (const [field, spec] of Object.entries(properties)) {\n    const value = record[field];\n    if (value === undefined || value === null) continue;\n    const fieldSpec = spec;\n    if (fieldSpec.type === 'string' && typeof value !== 'string') recordErrors.push({ field, error: 'type', expected: 'string', got: typeof value });\n    if (fieldSpec.type === 'number' && typeof value !== 'number') recordErrors.push({ field, error: 'type', expected: 'number', got: typeof value });\n    if (fieldSpec.type === 'boolean' && typeof value !== 'boolean') recordErrors.push({ field, error: 'type', expected: 'boolean', got: typeof value });\n    if (fieldSpec.type === 'integer' && (!Number.isInteger(value))) recordErrors.push({ field, error: 'type', expected: 'integer', got: typeof value });\n    if (fieldSpec.type === 'array' && !Array.isArray(value)) recordErrors.push({ field, error: 'type', expected: 'array', got: typeof value });\n    if (fieldSpec.minimum !== undefined && typeof value === 'number' && value < fieldSpec.minimum) recordErrors.push({ field, error: 'minimum', minimum: fieldSpec.minimum, got: value });\n    if (fieldSpec.maximum !== undefined && typeof value === 'number' && value > fieldSpec.maximum) recordErrors.push({ field, error: 'maximum', maximum: fieldSpec.maximum, got: value });\n    if (fieldSpec.minLength !== undefined && typeof value === 'string' && value.length < fieldSpec.minLength) recordErrors.push({ field, error: 'minLength', minLength: fieldSpec.minLength, got: value.length });\n    if (fieldSpec.maxLength !== undefined && typeof value === 'string' && value.length > fieldSpec.maxLength) recordErrors.push({ field, error: 'maxLength', maxLength: fieldSpec.maxLength, got: value.length });\n    if (fieldSpec.pattern && typeof value === 'string' && !new RegExp(fieldSpec.pattern).test(value)) recordErrors.push({ field, error: 'pattern', pattern: fieldSpec.pattern });\n    if (fieldSpec.enum && !fieldSpec.enum.includes(value)) recordErrors.push({ field, error: 'enum', allowed: fieldSpec.enum, got: value });\n    if (fieldSpec.format === 'email' && typeof value === 'string' && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) recordErrors.push({ field, error: 'format', format: 'email' });\n    if (fieldSpec.format === 'date' && typeof value === 'string' && isNaN(new Date(value).getTime())) recordErrors.push({ field, error: 'format', format: 'date' });\n    if (fieldSpec.format === 'uri' && typeof value === 'string' && !/^https?:\\/\\/.+/.test(value)) recordErrors.push({ field, error: 'format', format: 'uri' });\n  }\n  if (recordErrors.length > 0) {\n    results.push({ recordIndex: i, errors: recordErrors });\n    errorCount += recordErrors.length;\n  }\n}\nconst validCount = records.length - results.length;\nresult = JSON.stringify({ totalRecords: records.length, valid: validCount, invalid: results.length, validationRate: records.length > 0 ? Math.round(validCount / records.length * 10000) / 100 : 100, errorCount, maxErrorsReached: errorCount >= maxErrors, errors: results });",
      },
    ],
    mcpIntegration: `Scheduled trigger (cron or webhook) sends pipeline config to /api/mcp.
Each stage streams events via SSE for real-time dashboard updates.
Quality report generated before load stage — blocks if quality score < 95%.
Token costs tracked per stage for cost optimization.
Full pipeline trace exportable as JSON for audit and debugging.`,
    gradingSuite: [
      {
        caseName: "Detect and quarantine invalid records",
        input: `Source returns 1000 records. 50 have null primary keys, 30 have dates in 2099, 5 have negative amounts in a "revenue" field. Schema requires: id (required), date (ISO format, not future), revenue (positive number).`,
        criteria: `- output_match: extract stage reports 1000 records pulled (weight: 0.15)
- output_match: validate stage catches all 85 invalid records with specific reasons (weight: 0.35)
- output_match: load stage loads only 915 valid records (weight: 0.25)
- output_match: quality report shows score reflecting 91.5% validity (weight: 0.15)
- output_match: events emitted for each stage with timing and costs (weight: 0.1)`,
      },
      {
        caseName: "Pipeline halts on high error rate",
        input: `Source returns 100 records. 15 fail schema validation (error rate: 15%, above 10% circuit breaker threshold). Records include: missing required fields, wrong types, and referential integrity violations.`,
        criteria: `- output_match: circuit breaker triggers at >10% error rate (weight: 0.3)
- output_match: pipeline status is "failed", not "partial" (weight: 0.2)
- output_match: zero records loaded (load stage skipped) (weight: 0.2)
- output_match: all 15 failed records in dead letter queue with reasons (weight: 0.2)
- output_match: alert event emitted with failure details (weight: 0.1)`,
      },
    ],
  },
];
