import {
  collection,
  doc,
  type DocumentData,
  type CollectionReference,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./config";

// --- Type definitions ---

export interface UserSubscription {
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: "starter" | "pro" | "usage" | "enterprise";
  status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface UserDoc {
  displayName: string;
  email: string;
  apiKeys: Record<string, string>;
  defaultProvider: string;
  defaultModel: string;
  githubAccessToken?: string;
  subscription?: UserSubscription;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PurposeGateConfig {
  enabled: boolean;
  question: string;
  injectInSystemPrompt: boolean;
}

export interface TillDoneConfig {
  enabled: boolean;
  requireTaskListBeforeExecution: boolean;
  autoPromptOnIncomplete: boolean;
  confirmBeforeClear: boolean;
}

export interface AgentBranding {
  themeColor: string;
  accentColor: string;
  icon: string;
}

export interface ToolOverrideConfig {
  toolName: string;
  wrapperCode: string;
  enabled: boolean;
}

export interface AgentDoc {
  name: string;
  description: string;
  domain: string;
  systemPrompt: string;
  modelProvider: string;
  modelId: string;
  thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
  builtinTools: string[];
  connectedRepos: string[];
  version: number;
  isPublished: boolean;
  latestGradingScore: number | null;
  purposeGate: PurposeGateConfig | null;
  tillDone: TillDoneConfig | null;
  branding: AgentBranding | null;
  toolOverrides: ToolOverrideConfig[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SkillDoc {
  name: string;
  description: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ToolDoc {
  name: string;
  label: string;
  description: string;
  parametersSchema: string;
  executeCode: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExtensionDoc {
  name: string;
  description: string;
  code: string;
  events: ExtensionEventType[];
  blocking: boolean;
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VersionDoc {
  version: number;
  snapshot: string;
  gradingPassed: boolean | null;
  publishedAt: Timestamp;
}

export interface GradingSuiteDoc {
  name: string;
  description: string;
  createdAt: Timestamp;
}

export interface CriterionConfig {
  id: string;
  type: "output_match" | "schema_validation" | "tool_usage" | "safety_check" | "custom_script" | "llm_judge";
  name: string;
  config: Record<string, unknown>;
  weight: number;
}

export interface GradingCaseDoc {
  name: string;
  inputPrompt: string;
  expectedBehavior: string;
  orderIndex: number;
  criteria: CriterionConfig[];
  createdAt: Timestamp;
}

export interface ImprovementNote {
  category: "system_prompt" | "skill" | "tool" | "general";
  severity: "critical" | "suggestion";
  title: string;
  detail: string;
}

export interface GradingRunDoc {
  agentVersion: number;
  status: "pending" | "running" | "completed" | "failed";
  score: number | null;
  totalCases: number;
  passedCases: number;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
  improvementSummary?: string;
  improvementNotes?: ImprovementNote[];
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: string;
  isError: boolean;
}

export interface CriterionResult {
  criterionId: string;
  criterionType: string;
  passed: boolean;
  score: number;
  message: string;
}

export interface RunResultDoc {
  caseId: string;
  passed: boolean;
  score: number;
  agentOutput: string;
  toolCalls: ToolCallRecord[];
  criteriaResults: CriterionResult[];
  durationMs: number;
  createdAt: Timestamp;
}

export interface McpServerDoc {
  name: string;
  description: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  enabled: boolean;
  rateLimitPerMinute: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ApiKeyIndexDoc {
  userId: string;
  agentId: string;
  mcpServerId: string;
  enabled: boolean;
  rateLimitPerMinute: number;
  createdAt: Timestamp;
}

export interface McpUsageDoc {
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  lastRequestAt: Timestamp;
}

// --- Agent Teams ---

export interface AgentTeamMember {
  agentId: string;
  role: string;
  order: number;
  description: string;
}

export interface AgentTeamDoc {
  name: string;
  description: string;
  agents: AgentTeamMember[];
  executionMode: "parallel" | "sequential" | "conditional";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Pipelines ---

export interface PipelineStep {
  agentId: string;
  role: string;
  order: number;
  inputMapping: "previous_output" | "original_input" | "custom";
  customInputTemplate?: string;
  continueOnError: boolean;
}

export interface PipelineDoc {
  name: string;
  description: string;
  steps: PipelineStep[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Sessions / Observability ---

export interface SessionEvent {
  type:
    | "message"
    | "tool_call"
    | "tool_result"
    | "sub_agent_spawn"
    | "sub_agent_result"
    | "error"
    | "compact"
    | "pipeline_step"
    | "team_member";
  timestamp: Timestamp;
  data: Record<string, unknown>;
}

export interface SessionDoc {
  purpose: string | null;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  toolCallCount: number;
  subAgentCallCount: number;
  messageCount: number;
  modelUsed: string;
  providerUsed: string;
  events: SessionEvent[];
}

// --- Usage / Billing ---

export interface UsageDoc {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  requestCount: number;
  agentBreakdown: Record<string, { inputTokens: number; outputTokens: number; cost: number }>;
  autoresearchIterations?: number;
}

// --- AutoResearch ---

export interface AutoResearchRunDoc {
  mode: "autofix" | "autotune" | "stress_lab" | "evolution" | "distillation" | "tournament";
  suiteId: string;
  status: "running" | "completed" | "stopped" | "error";
  config: Record<string, unknown>;
  baselineScore: number;
  bestScore: number;
  bestIterationIndex: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCost: number;
  iterationCount: number;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface AutoResearchIterationDoc {
  index: number;
  configSnapshot: Record<string, unknown>;
  gradingScore: number;
  criteriaBreakdown: Record<string, number>;
  delta: number;
  status: "keep" | "discard" | "crash" | "baseline";
  description: string;
  tokensInput: number;
  tokensOutput: number;
  durationMs: number;
  createdAt: Timestamp;
}

// --- Extension Event Types ---

export type ExtensionEventType =
  | "session_start"
  | "session_end"
  | "session_compact"
  | "message_start"
  | "message_end"
  | "message_stream_token"
  | "tool_call_start"
  | "tool_call_end"
  | "tool_call_error"
  | "tool_call_blocked"
  | "agent_thinking_start"
  | "agent_thinking_end"
  | "agent_response_start"
  | "agent_response_end"
  | "sub_agent_spawn"
  | "sub_agent_result"
  | "sub_agent_error"
  | "pipeline_start"
  | "pipeline_step_start"
  | "pipeline_step_end"
  | "pipeline_end"
  | "team_execution_start"
  | "team_member_start"
  | "team_member_end"
  | "team_execution_end"
  | "user_input"
  | "user_confirm"
  | "user_deny"
  | "error"
  | "context_limit_warning"
  | "cost_limit_warning"
  | "autoresearch_run_start"
  | "autoresearch_iteration_start"
  | "autoresearch_iteration_end"
  | "autoresearch_mutation"
  | "autoresearch_run_end";

// --- Typed collection refs ---

function typedCollection<T = DocumentData>(path: string) {
  return collection(db, path) as CollectionReference<T>;
}

export function usersCollection() {
  return typedCollection<UserDoc>("users");
}

export function userDoc(userId: string) {
  return doc(db, "users", userId);
}

export function agentsCollection(userId: string) {
  return typedCollection<AgentDoc>(`users/${userId}/agents`);
}

export function agentDoc(userId: string, agentId: string) {
  return doc(db, "users", userId, "agents", agentId);
}

export function skillsCollection(userId: string, agentId: string) {
  return typedCollection<SkillDoc>(`users/${userId}/agents/${agentId}/skills`);
}

export function skillDoc(userId: string, agentId: string, skillId: string) {
  return doc(db, "users", userId, "agents", agentId, "skills", skillId);
}

export function toolsCollection(userId: string, agentId: string) {
  return typedCollection<ToolDoc>(`users/${userId}/agents/${agentId}/tools`);
}

export function toolDoc(userId: string, agentId: string, toolId: string) {
  return doc(db, "users", userId, "agents", agentId, "tools", toolId);
}

export function extensionsCollection(userId: string, agentId: string) {
  return typedCollection<ExtensionDoc>(`users/${userId}/agents/${agentId}/extensions`);
}

export function extensionDoc(userId: string, agentId: string, extensionId: string) {
  return doc(db, "users", userId, "agents", agentId, "extensions", extensionId);
}

export function versionsCollection(userId: string, agentId: string) {
  return typedCollection<VersionDoc>(`users/${userId}/agents/${agentId}/versions`);
}

export function gradingSuitesCollection(userId: string, agentId: string) {
  return typedCollection<GradingSuiteDoc>(`users/${userId}/agents/${agentId}/gradingSuites`);
}

export function gradingSuiteDoc(userId: string, agentId: string, suiteId: string) {
  return doc(db, "users", userId, "agents", agentId, "gradingSuites", suiteId);
}

export function gradingCasesCollection(userId: string, agentId: string, suiteId: string) {
  return typedCollection<GradingCaseDoc>(
    `users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/cases`
  );
}

export function gradingCaseDoc(userId: string, agentId: string, suiteId: string, caseId: string) {
  return doc(db, "users", userId, "agents", agentId, "gradingSuites", suiteId, "cases", caseId);
}

export function gradingRunsCollection(userId: string, agentId: string, suiteId: string) {
  return typedCollection<GradingRunDoc>(
    `users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs`
  );
}

export function gradingRunDoc(userId: string, agentId: string, suiteId: string, runId: string) {
  return doc(db, "users", userId, "agents", agentId, "gradingSuites", suiteId, "runs", runId);
}

export function runResultsCollection(
  userId: string,
  agentId: string,
  suiteId: string,
  runId: string
) {
  return typedCollection<RunResultDoc>(
    `users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}/results`
  );
}

// --- MCP Server collections ---

export function mcpServersCollection(userId: string, agentId: string) {
  return typedCollection<McpServerDoc>(`users/${userId}/agents/${agentId}/mcpServers`);
}

export function mcpServerDoc(userId: string, agentId: string, serverId: string) {
  return doc(db, "users", userId, "agents", agentId, "mcpServers", serverId);
}

export function mcpUsageCollection(userId: string, agentId: string, serverId: string) {
  return typedCollection<McpUsageDoc>(
    `users/${userId}/agents/${agentId}/mcpServers/${serverId}/usage`
  );
}

export function mcpUsageDoc(userId: string, agentId: string, serverId: string, yearMonth: string) {
  return doc(db, "users", userId, "agents", agentId, "mcpServers", serverId, "usage", yearMonth);
}

// --- Agent Teams collections ---

export function agentTeamsCollection(userId: string) {
  return typedCollection<AgentTeamDoc>(`users/${userId}/agentTeams`);
}

export function agentTeamDoc(userId: string, teamId: string) {
  return doc(db, "users", userId, "agentTeams", teamId);
}

// --- Pipelines collections ---

export function pipelinesCollection(userId: string, agentId: string) {
  return typedCollection<PipelineDoc>(`users/${userId}/agents/${agentId}/pipelines`);
}

export function pipelineDoc(userId: string, agentId: string, pipelineId: string) {
  return doc(db, "users", userId, "agents", agentId, "pipelines", pipelineId);
}

// --- Sessions collections ---

export function sessionsCollection(userId: string, agentId: string) {
  return typedCollection<SessionDoc>(`users/${userId}/agents/${agentId}/sessions`);
}

export function sessionDoc(userId: string, agentId: string, sessionId: string) {
  return doc(db, "users", userId, "agents", agentId, "sessions", sessionId);
}

// --- AutoResearch collections ---

export function autoresearchRunsCollection(userId: string, agentId: string) {
  return typedCollection<AutoResearchRunDoc>(`users/${userId}/agents/${agentId}/autoresearchRuns`);
}

export function autoresearchRunDoc(userId: string, agentId: string, runId: string) {
  return doc(db, "users", userId, "agents", agentId, "autoresearchRuns", runId);
}

export function autoresearchIterationsCollection(userId: string, agentId: string, runId: string) {
  return typedCollection<AutoResearchIterationDoc>(
    `users/${userId}/agents/${agentId}/autoresearchRuns/${runId}/iterations`
  );
}

// --- Usage / Billing collections ---

export function usageCollection(userId: string) {
  return typedCollection<UsageDoc>(`users/${userId}/usage`);
}

export function usageDoc(userId: string, yearMonth: string) {
  return doc(db, "users", userId, "usage", yearMonth);
}

// --- Bug tracking collections ---

export type BugStatus = "new" | "analyzing" | "fixing" | "awaiting_review" | "fixed" | "closed" | "wont_fix";

export interface BugDoc {
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  pageUrl: string;
  reporterEmail: string;
  status: BugStatus;
  agentId: string | null;
  assignedAt: Timestamp | null;
  analysis: string | null;
  fixBranch: string | null;
  fixPrUrl: string | null;
  fixCommitSha: string | null;
  thankYouSent: boolean;
  notes: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function bugsCollection(userId: string) {
  return typedCollection<BugDoc>(`users/${userId}/bugs`);
}

export function bugDoc(userId: string, bugId: string) {
  return doc(db, "users", userId, "bugs", bugId);
}

// --- Connectors ---

export type WebhookEventType = "message_sent" | "tool_call_completed" | "session_ended" | "error";

export interface WidgetConfigDoc {
  enabled: boolean;
  apiKeyHash: string;
  apiKeyPrefix: string;
  apiKeyPlain?: string;
  welcomeMessage: string;
  position: "bottom-right" | "bottom-left";
  showPoweredBy: boolean;
  allowedOrigins: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WebhookDoc {
  name: string;
  type: "inbound" | "outbound";
  enabled: boolean;
  secret: string | null;
  targetUrl: string | null;
  events: WebhookEventType[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WebhookLogDoc {
  webhookId: string;
  direction: "inbound" | "outbound";
  status: "success" | "error";
  statusCode: number | null;
  requestBody: string;
  responseBody: string;
  durationMs: number;
  createdAt: Timestamp;
}

export interface SlackConnectionDoc {
  teamId: string;
  teamName: string;
  botToken: string;
  botUserId: string;
  channels: string[];
  enabled: boolean;
  installedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SlackTeamIndexDoc {
  userId: string;
  agentId: string;
}

// --- Error Log types ---

export type ErrorSeverity = "warning" | "error" | "critical";
export type ErrorSource =
  | "slack_events"
  | "webhook_inbound"
  | "webhook_outbound"
  | "widget_chat"
  | "chat"
  | "grading"
  | "mcp"
  | "billing"
  | "session"
  | "autoresearch"
  | "pipeline"
  | "team"
  | "meta_agent"
  | "plan_guard"
  | "system";

export interface ErrorLogDoc {
  /** Error name / code (e.g. "PLAN_LIMIT_EXCEEDED", "SLACK_TOKEN_INVALID") */
  code: string;
  /** Human-readable message */
  message: string;
  /** Where the error occurred */
  source: ErrorSource;
  /** Severity level */
  severity: ErrorSeverity;
  /** User who triggered the error (if known) */
  userId: string | null;
  /** Agent involved (if applicable) */
  agentId: string | null;
  /** Additional context (stack trace, request data, etc.) */
  metadata: Record<string, unknown>;
  /** Whether the user was notified about this error */
  userNotified: boolean;
  /** Timestamp */
  createdAt: Timestamp;
}

export function errorLogsCollection() {
  return typedCollection<ErrorLogDoc>("errorLogs");
}

// --- Connector collection helpers ---

export function widgetConfigDoc(userId: string, agentId: string) {
  return doc(db, "users", userId, "agents", agentId, "connectors", "widget");
}

export function webhooksCollection(userId: string, agentId: string) {
  return typedCollection<WebhookDoc>(`users/${userId}/agents/${agentId}/webhooks`);
}

export function webhookDoc(userId: string, agentId: string, webhookId: string) {
  return doc(db, "users", userId, "agents", agentId, "webhooks", webhookId);
}

export function webhookLogsCollection(userId: string, agentId: string) {
  return typedCollection<WebhookLogDoc>(`users/${userId}/agents/${agentId}/webhookLogs`);
}

export function slackConnectionDoc(userId: string, agentId: string) {
  return doc(db, "users", userId, "agents", agentId, "connectors", "slackConnection");
}
