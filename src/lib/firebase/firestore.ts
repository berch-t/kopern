import {
  collection,
  doc,
  type DocumentData,
  type CollectionReference,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./config";

// --- Type definitions ---

export interface UserDoc {
  displayName: string;
  email: string;
  apiKeys: Record<string, string>;
  defaultProvider: string;
  defaultModel: string;
  githubAccessToken?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

export interface GradingRunDoc {
  agentVersion: number;
  status: "pending" | "running" | "completed" | "failed";
  score: number | null;
  totalCases: number;
  passedCases: number;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
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
