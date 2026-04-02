// ─── MCP Platform Tools — Vague 1 Execution Functions ──────────────────────
// All functions use Firebase Admin SDK (server-side only).
// Called from /api/mcp/server/route.ts

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { resolveProviderKeys } from "@/lib/llm/resolve-key";
import { runAgentWithTools, type AgentRunMetrics } from "@/lib/tools/run-agent";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { runGradingSuite } from "@/lib/grading/runner";
import { buildCriterionConfig } from "@/lib/grading/build-criterion-config";
import { runAutoTune } from "@/lib/autoresearch/runner";
import type { AutoResearchConfig, AutoResearchRun, AutoResearchCallbacks } from "@/lib/autoresearch/types";
import type { CriterionConfig } from "@/lib/firebase/firestore";
import type { LLMMessage } from "@/lib/llm/client";
import { useCases } from "@/data/use-cases";
import { verticalTemplates } from "@/data/vertical-templates";

// ─── Response helpers ───────────────────────────────────────────────

type ToolResult = {
  isError?: boolean;
  content: { type: string; text: string }[];
};

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function err(message: string): ToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

// ─── Agent CRUD ─────────────────────────────────────────────────────

export async function executeCreateAgent(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const name = params.name as string;
  const systemPrompt = params.system_prompt as string;
  if (!name) return err("name is required");
  if (!systemPrompt) return err("system_prompt is required");

  const provider = (params.provider as string) || "anthropic";
  const model = (params.model as string) || "claude-sonnet-4-6";
  const domain = (params.domain as string) || "other";
  const description = (params.description as string) || "";
  const builtinTools = (params.builtin_tools as string[]) || [];

  const ref = await adminDb.collection(`users/${userId}/agents`).add({
    name,
    description,
    domain,
    systemPrompt,
    modelProvider: provider,
    modelId: model,
    thinkingLevel: "off",
    builtinTools,
    connectedRepos: [],
    version: 1,
    isPublished: false,
    latestGradingScore: null,
    purposeGate: null,
    tillDone: null,
    branding: null,
    toolOverrides: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Create skills if provided
  const skills = params.skills as { name: string; content: string }[] | undefined;
  if (skills?.length) {
    const batch = adminDb.batch();
    for (const s of skills) {
      const sRef = adminDb.collection(`users/${userId}/agents/${ref.id}/skills`).doc();
      batch.set(sRef, {
        name: s.name,
        description: s.name,
        content: s.content,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  return ok({
    agentId: ref.id,
    name,
    message: `Agent "${name}" created successfully. Use kopern_chat with an agent-bound API key to talk to it, or kopern_connect_* to deploy it.`,
  });
}

export async function executeGetAgent(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  if (!agentId) return err("agent_id is required");

  const snap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!snap.exists) return err(`Agent ${agentId} not found`);

  const data = snap.data()!;

  // Load subcollection counts in parallel
  const [skillsSnap, toolsSnap, suitesSnap] = await Promise.all([
    adminDb.collection(`users/${userId}/agents/${agentId}/skills`).count().get(),
    adminDb.collection(`users/${userId}/agents/${agentId}/tools`).count().get(),
    adminDb.collection(`users/${userId}/agents/${agentId}/gradingSuites`).count().get(),
  ]);

  return ok({
    id: agentId,
    name: data.name,
    description: data.description,
    domain: data.domain,
    systemPrompt: data.systemPrompt,
    model: { provider: data.modelProvider, id: data.modelId },
    thinkingLevel: data.thinkingLevel,
    builtinTools: data.builtinTools || [],
    version: data.version || 1,
    latestGradingScore: data.latestGradingScore ?? null,
    toolApprovalPolicy: data.toolApprovalPolicy || "auto",
    connectedRepos: data.connectedRepos || [],
    counts: {
      skills: skillsSnap.data().count,
      tools: toolsSnap.data().count,
      gradingSuites: suitesSnap.data().count,
    },
  });
}

export async function executeUpdateAgent(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  if (!agentId) return err("agent_id is required");

  const snap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!snap.exists) return err(`Agent ${agentId} not found`);

  // Build update payload from provided fields
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (params.name !== undefined) updates.name = params.name;
  if (params.description !== undefined) updates.description = params.description;
  if (params.domain !== undefined) updates.domain = params.domain;
  if (params.system_prompt !== undefined) {
    updates.systemPrompt = params.system_prompt;
    updates.version = FieldValue.increment(1);
  }
  if (params.provider !== undefined) updates.modelProvider = params.provider;
  if (params.model !== undefined) updates.modelId = params.model;
  if (params.builtin_tools !== undefined) updates.builtinTools = params.builtin_tools;

  if (Object.keys(updates).length <= 1) return err("No fields to update. Provide at least one of: name, description, domain, system_prompt, provider, model, builtin_tools");

  await adminDb.doc(`users/${userId}/agents/${agentId}`).update(updates);

  return ok({ agentId, updated: Object.keys(updates).filter(k => k !== "updatedAt" && k !== "version"), message: "Agent updated successfully" });
}

export async function executeDeleteAgent(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  if (!agentId) return err("agent_id is required");

  const snap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!snap.exists) return err(`Agent ${agentId} not found`);

  const agentName = snap.data()!.name;

  // Delete subcollections (Firestore doesn't cascade)
  const subcollections = [
    "skills", "tools", "extensions", "versions", "mcpServers",
    "pipelines", "sessions", "autoresearchRuns", "webhooks", "webhookLogs", "memory",
  ];

  for (const sub of subcollections) {
    const subSnap = await adminDb.collection(`users/${userId}/agents/${agentId}/${sub}`).listDocuments();
    if (subSnap.length > 0) {
      const batch = adminDb.batch();
      subSnap.forEach(doc => batch.delete(doc));
      await batch.commit();
    }
  }

  // Delete grading suites + nested cases/runs
  const suitesSnap = await adminDb.collection(`users/${userId}/agents/${agentId}/gradingSuites`).listDocuments();
  for (const suiteRef of suitesSnap) {
    const nested = ["cases", "runs"];
    for (const n of nested) {
      const nestedDocs = await suiteRef.collection(n).listDocuments();
      if (nestedDocs.length > 0) {
        const batch = adminDb.batch();
        nestedDocs.forEach(doc => batch.delete(doc));
        await batch.commit();
      }
    }
    await suiteRef.delete();
  }

  // Delete connectors subdocs
  const connectorDocs = await adminDb.collection(`users/${userId}/agents/${agentId}/connectors`).listDocuments();
  for (const cDoc of connectorDocs) {
    await cDoc.delete();
  }

  // Delete the agent document
  await adminDb.doc(`users/${userId}/agents/${agentId}`).delete();

  return ok({ agentId, name: agentName, message: `Agent "${agentName}" deleted permanently` });
}

// ─── Deploy Template ────────────────────────────────────────────────

export async function executeDeployTemplate(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const slug = params.slug as string;
  if (!slug) return err("slug is required. Use kopern_list_templates to see available templates.");

  // Find template
  const generalMatch = useCases.find(t => t.slug === slug);
  const verticalMatch = verticalTemplates.find(t => t.slug === slug);

  if (!generalMatch && !verticalMatch) {
    return err(`Template "${slug}" not found. Use kopern_list_templates to see available slugs.`);
  }

  const answers = (params.answers as Record<string, string>) || {};

  if (verticalMatch) {
    // Vertical template: hydrate prompt, create full agent
    const { hydratePrompt, extractAgentName } = await import("@/lib/templates/hydrate");
    const agentName = extractAgentName(verticalMatch, answers, "en");
    const systemPrompt = hydratePrompt(verticalMatch.systemPromptTemplate, answers);

    const ref = await adminDb.collection(`users/${userId}/agents`).add({
      name: agentName,
      description: verticalMatch.description,
      domain: verticalMatch.domain,
      systemPrompt,
      modelProvider: verticalMatch.modelProvider,
      modelId: verticalMatch.modelId,
      thinkingLevel: "off",
      builtinTools: [],
      connectedRepos: [],
      version: 1,
      isPublished: false,
      latestGradingScore: null,
      purposeGate: null,
      tillDone: null,
      branding: null,
      toolOverrides: [],
      templateId: verticalMatch.slug,
      templateVariables: answers,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const agentId = ref.id;

    // Create skills + tools + grading suite in parallel
    const batch = adminDb.batch();

    for (const skill of verticalMatch.skills) {
      const sRef = adminDb.collection(`users/${userId}/agents/${agentId}/skills`).doc();
      batch.set(sRef, {
        name: skill.name,
        description: `${verticalMatch.domain} domain knowledge`,
        content: skill.content,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    for (const tool of verticalMatch.tools) {
      const tRef = adminDb.collection(`users/${userId}/agents/${agentId}/tools`).doc();
      batch.set(tRef, {
        name: tool.name,
        label: tool.name.replace(/_/g, " "),
        description: tool.description,
        parametersSchema: tool.params,
        executeCode: tool.executeCode,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Grading suite
    const suiteRef = adminDb.collection(`users/${userId}/agents/${agentId}/gradingSuites`).doc();
    batch.set(suiteRef, {
      name: `Test suite — ${agentName}`,
      description: `Quality tests for ${agentName}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    for (const [i, tc] of verticalMatch.gradingSuite.entries()) {
      const cRef = suiteRef.collection("cases").doc();
      batch.set(cRef, {
        name: tc.caseName,
        inputPrompt: tc.input,
        expectedBehavior: tc.expectedBehavior,
        orderIndex: i,
        criteria: [],
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    // List required onboarding questions for context
    const requiredQuestions = verticalMatch.onboardingQuestions
      .filter(q => q.required)
      .map(q => ({ id: q.id, label: q.label, type: q.type }));

    return ok({
      agentId,
      name: agentName,
      template: verticalMatch.slug,
      skills: verticalMatch.skills.length,
      tools: verticalMatch.tools.length,
      gradingCases: verticalMatch.gradingSuite.length,
      message: `Agent "${agentName}" deployed from template "${verticalMatch.slug}" with ${verticalMatch.skills.length} skills, ${verticalMatch.tools.length} tools, and ${verticalMatch.gradingSuite.length} grading cases.`,
      ...(requiredQuestions.length > 0 && Object.keys(answers).length === 0
        ? { hint: "This template has onboarding questions. Re-deploy with answers for a personalized agent.", questions: requiredQuestions }
        : {}),
    });
  }

  // General template (use-case): simpler, just system prompt + tools
  const generalTemplate = generalMatch!;
  const ref = await adminDb.collection(`users/${userId}/agents`).add({
    name: generalTemplate.title,
    description: generalTemplate.tagline,
    domain: generalTemplate.domain,
    systemPrompt: generalTemplate.systemPrompt,
    modelProvider: "anthropic",
    modelId: "claude-sonnet-4-6",
    thinkingLevel: "off",
    builtinTools: [],
    connectedRepos: [],
    version: 1,
    isPublished: false,
    latestGradingScore: null,
    purposeGate: null,
    tillDone: null,
    branding: null,
    toolOverrides: [],
    templateId: generalTemplate.slug,
    templateVariables: {},
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const agentId = ref.id;

  // Create tools from template
  if (generalTemplate.tools?.length) {
    const batch = adminDb.batch();
    for (const tool of generalTemplate.tools) {
      const tRef = adminDb.collection(`users/${userId}/agents/${agentId}/tools`).doc();
      batch.set(tRef, {
        name: tool.name,
        label: tool.name.replace(/_/g, " "),
        description: tool.description,
        parametersSchema: tool.params,
        executeCode: tool.executeCode,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  return ok({
    agentId,
    name: generalTemplate.title,
    template: generalTemplate.slug,
    tools: generalTemplate.tools?.length || 0,
    message: `Agent "${generalTemplate.title}" deployed from template "${generalTemplate.slug}".`,
  });
}

// ─── Grading Suite CRUD ─────────────────────────────────────────────

export async function executeCreateGradingSuite(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  if (!agentId) return err("agent_id is required");

  const cases = params.cases as { name: string; input: string; expected: string; criterion_type?: string }[];
  if (!cases?.length) return err("cases is required (array of test cases)");
  if (cases.length > 50) return err("Maximum 50 cases per suite");

  // Verify agent exists
  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  const suiteName = (params.name as string) || `Test Suite — ${agentSnap.data()!.name}`;
  const suiteDesc = (params.description as string) || `Grading suite with ${cases.length} test cases`;

  // Create suite
  const suiteRef = await adminDb.collection(`users/${userId}/agents/${agentId}/gradingSuites`).add({
    name: suiteName,
    description: suiteDesc,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Create cases
  const batch = adminDb.batch();
  for (const [i, c] of cases.entries()) {
    const cRef = suiteRef.collection("cases").doc();
    const criterionType = (c.criterion_type || "llm_judge") as CriterionConfig["type"];
    batch.set(cRef, {
      name: c.name,
      inputPrompt: c.input,
      expectedBehavior: c.expected,
      orderIndex: i,
      criteria: [
        {
          id: `crit_${i}`,
          type: criterionType,
          name: c.name,
          config: buildCriterionConfig(criterionType, c.expected),
          weight: 1,
        },
      ] satisfies CriterionConfig[],
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  return ok({
    suiteId: suiteRef.id,
    agentId,
    name: suiteName,
    casesCount: cases.length,
    message: `Grading suite "${suiteName}" created with ${cases.length} test cases.`,
  });
}

export async function executeRunGrading(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const suiteId = params.suite_id as string;
  if (!agentId) return err("agent_id is required");
  if (!suiteId) return err("suite_id is required");

  // Load agent
  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);
  const agentData = agentSnap.data()!;

  // Load cases
  const casesSnap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/cases`)
    .orderBy("orderIndex")
    .get();

  if (casesSnap.empty) return err(`No test cases found in suite ${suiteId}`);

  const provider = agentData.modelProvider || "anthropic";
  const model = agentData.modelId || "claude-sonnet-4-6";

  // Resolve API keys
  const apiKeys = await resolveProviderKeys(userId, provider);
  const apiKey = apiKeys[0];
  if (!apiKey) return err(`No ${provider} API key found. Add one at kopern.ai → Settings.`);

  // Build grading cases
  const gradingCases = casesSnap.docs.map(doc => {
    const d = doc.data();
    return {
      id: doc.id,
      name: d.name,
      inputPrompt: d.inputPrompt,
      expectedBehavior: d.expectedBehavior,
      orderIndex: d.orderIndex,
      criteria: (d.criteria || []).map((c: CriterionConfig) => ({
        ...c,
        config: Object.keys(c.config || {}).length > 0 ? c.config : buildCriterionConfig(c.type, d.expectedBehavior),
      })),
      createdAt: d.createdAt,
    };
  });

  // Load system prompt + skills
  let systemPrompt = agentData.systemPrompt || "";
  const skillsSnap = await adminDb.collection(`users/${userId}/agents/${agentId}/skills`).get();
  if (!skillsSnap.empty) {
    const xml = skillsSnap.docs.map(d => `<skill name="${d.data().name}">\n${d.data().content}\n</skill>`).join("\n\n");
    systemPrompt += `\n\n<skills>\n${xml}\n</skills>`;
  }

  // Execute each case
  const executeCase = async (inputPrompt: string) => {
    const collector = createEventCollector();
    const messages: LLMMessage[] = [{ role: "user" as const, content: inputPrompt }];

    await new Promise<AgentRunMetrics>((resolve, reject) => {
      runAgentWithTools(
        {
          provider,
          model,
          systemPrompt,
          messages,
          userId,
          agentId,
          connectedRepos: (agentData.connectedRepos as string[]) || [],
          apiKey,
          apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
          skipOutboundWebhooks: true,
          toolApprovalPolicy: "auto",
          riskLevel: "minimal",
        },
        {
          onToken: (text) => { collector.addToken(text); },
          onToolStart: () => {},
          onToolEnd: (result) => {
            collector.addToolCall({ name: result.name, args: {}, result: result.result, isError: result.isError });
          },
          onDone: (m) => { collector.finalize(); resolve(m); },
          onError: (err) => reject(err),
        }
      );
    });

    return collector;
  };

  try {
    const result = await runGradingSuite(gradingCases, executeCase);

    // Update agent's latest grading score
    await adminDb.doc(`users/${userId}/agents/${agentId}`).update({
      latestGradingScore: Math.round(result.score * 100) / 100,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Persist run
    const runRef = await adminDb.collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs`).add({
      agentVersion: agentData.version || 1,
      status: "completed",
      score: result.score,
      totalCases: result.totalCases,
      passedCases: result.passedCases,
      startedAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return ok({
      runId: runRef.id,
      overallScore: Math.round(result.score * 100) / 100,
      passed: result.passedCases,
      total: result.totalCases,
      cases: result.results.map(r => ({
        name: r.caseName,
        passed: r.passed,
        score: Math.round(r.score * 100) / 100,
        output: r.agentOutput.slice(0, 500),
        criteria: r.criteriaResults.map(cr => ({
          type: cr.criterionType,
          passed: cr.passed,
          score: Math.round(cr.score * 100) / 100,
          message: cr.message,
        })),
      })),
    });
  } catch (e) {
    return err(`Grading error: ${(e as Error).message}`);
  }
}

// ─── AutoResearch (AutoTune) ────────────────────────────────────────

export async function executeRunAutoresearch(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const suiteId = params.suite_id as string;
  if (!agentId) return err("agent_id is required");
  if (!suiteId) return err("suite_id is required");

  // Verify agent + suite exist
  const [agentSnap, suiteSnap] = await Promise.all([
    adminDb.doc(`users/${userId}/agents/${agentId}`).get(),
    adminDb.doc(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}`).get(),
  ]);
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);
  if (!suiteSnap.exists) return err(`Grading suite ${suiteId} not found`);

  const config: AutoResearchConfig = {
    agentId,
    userId,
    suiteId,
    mode: "autotune",
    maxIterations: Math.min((params.max_iterations as number) || 5, 20),
    targetScore: (params.target_score as number) || undefined,
    maxTokenBudget: (params.max_token_budget as number) || undefined,
    mutationDimensions: ["system_prompt"],
    strategy: "llm_guided",
  };

  try {
    const run = await new Promise<AutoResearchRun>((resolve, reject) => {
      const callbacks: AutoResearchCallbacks = {
        onIterationStart: () => {},
        onIterationEnd: () => {},
        onProgress: () => {},
        onComplete: (run) => resolve(run),
        onError: (error) => reject(error),
      };
      runAutoTune(config, callbacks).catch(reject);
    });

    return ok({
      runId: run.id,
      status: run.status,
      baselineScore: Math.round(run.baselineScore * 100) / 100,
      bestScore: Math.round(run.bestScore * 100) / 100,
      improvement: Math.round((run.bestScore - run.baselineScore) * 100) / 100,
      iterations: run.iterations.length,
      totalTokens: run.totalTokensUsed,
      totalCost: Math.round(run.totalCost * 1000) / 1000,
      message: run.bestScore > run.baselineScore
        ? `AutoTune improved your agent from ${(run.baselineScore * 100).toFixed(0)}% to ${(run.bestScore * 100).toFixed(0)}%. The optimized system prompt has been applied.`
        : `AutoTune ran ${run.iterations.length} iterations but couldn't improve beyond baseline (${(run.baselineScore * 100).toFixed(0)}%). Your prompt may already be well-optimized.`,
    });
  } catch (e) {
    return err(`AutoResearch error: ${(e as Error).message}`);
  }
}

// ─── Teams ──────────────────────────────────────────────────────────

export async function executeCreateTeam(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const name = params.name as string;
  if (!name) return err("name is required");

  const agents = params.agents as { agent_id: string; role: string; order?: number }[];
  if (!agents?.length) return err("agents is required (array of { agent_id, role })");

  const executionMode = (params.execution_mode as string) || "sequential";
  if (!["parallel", "sequential", "conditional"].includes(executionMode)) {
    return err("execution_mode must be one of: parallel, sequential, conditional");
  }

  // Verify all agents exist and load their data
  const agentMembers = [];
  for (const [i, a] of agents.entries()) {
    const snap = await adminDb.doc(`users/${userId}/agents/${a.agent_id}`).get();
    if (!snap.exists) return err(`Agent ${a.agent_id} not found`);
    const data = snap.data()!;
    agentMembers.push({
      agentId: a.agent_id,
      agentName: data.name as string,
      role: a.role || "specialist",
      order: a.order ?? i,
      systemPrompt: data.systemPrompt as string,
      modelProvider: data.modelProvider as string,
      modelId: data.modelId as string,
    });
  }

  const ref = await adminDb.collection(`users/${userId}/agentTeams`).add({
    name,
    description: (params.description as string) || "",
    agents: agentMembers,
    executionMode,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return ok({
    teamId: ref.id,
    name,
    executionMode,
    agents: agentMembers.map(a => ({ agentId: a.agentId, name: a.agentName, role: a.role, order: a.order })),
    message: `Team "${name}" created with ${agentMembers.length} agents in ${executionMode} mode.`,
  });
}

export async function executeRunTeam(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const teamId = params.team_id as string;
  const prompt = params.prompt as string;
  if (!teamId) return err("team_id is required");
  if (!prompt) return err("prompt is required");

  // Load team
  const teamSnap = await adminDb.doc(`users/${userId}/agentTeams/${teamId}`).get();
  if (!teamSnap.exists) return err(`Team ${teamId} not found`);
  const team = teamSnap.data()!;
  const agents = team.agents as { agentId: string; agentName: string; role: string; order: number; systemPrompt: string; modelProvider: string; modelId: string }[];

  if (!agents?.length) return err("Team has no agents configured");

  // Helper: run a single team member
  async function runMember(agent: typeof agents[0], input: string): Promise<{ name: string; role: string; output: string; tokens: { input: number; output: number } }> {
    const apiKeys = await resolveProviderKeys(userId, agent.modelProvider);
    const messages: LLMMessage[] = [{ role: "user" as const, content: input }];
    let output = "";

    // Load skills
    let systemPrompt = agent.systemPrompt || "";
    const skillsSnap = await adminDb.collection(`users/${userId}/agents/${agent.agentId}/skills`).get();
    if (!skillsSnap.empty) {
      const xml = skillsSnap.docs.map(d => `<skill name="${d.data().name}">\n${d.data().content}\n</skill>`).join("\n\n");
      systemPrompt += `\n\n<skills>\n${xml}\n</skills>`;
    }

    const metrics = await new Promise<AgentRunMetrics>((resolve, reject) => {
      runAgentWithTools(
        {
          provider: agent.modelProvider,
          model: agent.modelId,
          systemPrompt,
          messages,
          userId,
          agentId: agent.agentId,
          connectedRepos: [],
          apiKey: apiKeys[0],
          apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
          skipOutboundWebhooks: true,
          toolApprovalPolicy: "auto",
          riskLevel: "minimal",
        },
        {
          onToken: (text) => { output += text; },
          onToolStart: () => {},
          onToolEnd: () => {},
          onDone: (m) => resolve(m),
          onError: (e) => reject(e),
        }
      );
    });

    return { name: agent.agentName, role: agent.role, output, tokens: { input: metrics.inputTokens, output: metrics.outputTokens } };
  }

  try {
    const mode = team.executionMode as string;
    const sortedAgents = [...agents].sort((a, b) => (a.order || 0) - (b.order || 0));
    const results: { name: string; role: string; output: string; tokens: { input: number; output: number } }[] = [];

    if (mode === "parallel") {
      const parallel = await Promise.all(sortedAgents.map(a => runMember(a, prompt)));
      results.push(...parallel);
    } else if (mode === "sequential") {
      let chainedInput = prompt;
      for (const agent of sortedAgents) {
        const result = await runMember(agent, chainedInput);
        results.push(result);
        chainedInput = `Previous agent (${result.name}, role: ${result.role}) responded:\n\n${result.output}\n\nOriginal request: ${prompt}`;
      }
    } else {
      // Conditional: first agent routes, second executes
      const router = sortedAgents[0];
      const routerResult = await runMember(router, `Route this request to the most appropriate team member:\n\n${prompt}\n\nAvailable members: ${sortedAgents.slice(1).map(a => `${a.agentName} (${a.role})`).join(", ")}`);
      results.push(routerResult);
      // Run remaining agents (simplified: run all, let coordinator pick)
      if (sortedAgents.length > 1) {
        const selected = sortedAgents[1]; // Default to first specialist
        const execResult = await runMember(selected, prompt);
        results.push(execResult);
      }
    }

    const totalTokens = results.reduce((acc, r) => ({
      input: acc.input + r.tokens.input,
      output: acc.output + r.tokens.output,
    }), { input: 0, output: 0 });

    return ok({
      teamId,
      teamName: team.name,
      executionMode: mode,
      results: results.map(r => ({
        agent: r.name,
        role: r.role,
        output: r.output.slice(0, 3000),
        tokens: r.tokens,
      })),
      totalTokens,
      finalOutput: results[results.length - 1].output,
    });
  } catch (e) {
    return err(`Team execution error: ${(e as Error).message}`);
  }
}

// ─── Connectors ─────────────────────────────────────────────────────

export async function executeConnectWidget(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  if (!agentId) return err("agent_id is required");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  // Generate widget API key
  const { generateApiKey, hashApiKey, getKeyPrefix } = await import("@/lib/mcp/auth");
  const plainKey = generateApiKey();
  const hash = hashApiKey(plainKey);
  const prefix = getKeyPrefix(plainKey);

  // Store widget config
  await adminDb.doc(`users/${userId}/agents/${agentId}/connectors/widget`).set({
    enabled: true,
    apiKeyHash: hash,
    apiKeyPrefix: prefix,
    apiKeyPlain: plainKey,
    welcomeMessage: (params.welcome_message as string) || "",
    position: (params.position as string) || "bottom-right",
    showPoweredBy: params.show_powered_by !== false,
    allowedOrigins: (params.allowed_origins as string[]) || [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // Store API key doc for resolution
  await adminDb.doc(`apiKeys/${hash}`).set({
    userId,
    agentId,
    mcpServerId: "__widget__",
    enabled: true,
    prefix,
    rateLimitPerMinute: 20,
    createdAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
    expiresAt: null,
    agentName: agentSnap.data()!.name,
    type: "widget",
  });

  return ok({
    agentId,
    enabled: true,
    embedCode: `<script src="https://kopern.ai/api/widget/script" data-key="${plainKey}" async></script>`,
    apiEndpoint: `https://kopern.ai/api/widget/chat`,
    message: "Widget connector activated. Add the embed code to your website.",
  });
}

export async function executeConnectWebhook(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  if (!agentId) return err("agent_id is required");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  const type = (params.type as string) || "inbound";
  if (!["inbound", "outbound"].includes(type)) return err("type must be 'inbound' or 'outbound'");

  const webhookData: Record<string, unknown> = {
    name: (params.name as string) || `${type} webhook`,
    type,
    enabled: true,
    secret: (params.secret as string) || null,
    targetUrl: (params.target_url as string) || null,
    events: (params.events as string[]) || [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (type === "outbound" && !webhookData.targetUrl) {
    return err("target_url is required for outbound webhooks");
  }

  const ref = await adminDb.collection(`users/${userId}/agents/${agentId}/webhooks`).add(webhookData);

  // For inbound: generate API key
  let inboundUrl = null;
  let apiKey = null;
  if (type === "inbound") {
    const { generateApiKey, hashApiKey, getKeyPrefix } = await import("@/lib/mcp/auth");
    const plainKey = generateApiKey();
    const hash = hashApiKey(plainKey);
    const prefix = getKeyPrefix(plainKey);

    await adminDb.doc(`apiKeys/${hash}`).set({
      userId,
      agentId,
      mcpServerId: "__webhook__",
      enabled: true,
      prefix,
      rateLimitPerMinute: 60,
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: null,
      expiresAt: null,
      agentName: agentSnap.data()!.name,
      type: "webhook",
    });

    apiKey = plainKey;
    inboundUrl = `https://kopern.ai/api/webhook/${agentId}?key=${plainKey}`;
  }

  return ok({
    webhookId: ref.id,
    agentId,
    type,
    ...(inboundUrl ? { inboundUrl, apiKey } : {}),
    ...(type === "outbound" ? { targetUrl: webhookData.targetUrl } : {}),
    message: type === "inbound"
      ? `Inbound webhook created. POST JSON to the URL to interact with your agent.`
      : `Outbound webhook created. Events will be sent to ${webhookData.targetUrl}.`,
  });
}

export async function executeConnectTelegram(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const botToken = params.bot_token as string;
  if (!agentId) return err("agent_id is required");
  if (!botToken) return err("bot_token is required (get one from @BotFather on Telegram)");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  // Verify bot token with Telegram API
  let botInfo: { username: string; first_name: string };
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const json = await res.json();
    if (!json.ok) return err(`Invalid Telegram bot token: ${json.description}`);
    botInfo = { username: json.result.username, first_name: json.result.first_name };
  } catch (e) {
    return err(`Failed to verify bot token: ${(e as Error).message}`);
  }

  // Generate webhook secret
  const crypto = await import("crypto");
  const secretToken = crypto.randomBytes(32).toString("hex");
  const secretHash = crypto.createHash("sha256").update(secretToken).digest("hex");

  // Set Telegram webhook
  const webhookUrl = `https://kopern.ai/api/telegram/webhook`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: secretToken }),
    });
    const json = await res.json();
    if (!json.ok) return err(`Failed to set Telegram webhook: ${json.description}`);
  } catch (e) {
    return err(`Failed to set webhook: ${(e as Error).message}`);
  }

  // Store connector doc
  await adminDb.doc(`users/${userId}/agents/${agentId}/connectors/telegram`).set({
    botToken,
    botUsername: botInfo.username,
    botFirstName: botInfo.first_name,
    secretHash,
    enabled: true,
    installedBy: userId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Top-level index for O(1) lookup
  await adminDb.doc(`telegramBots/${secretHash}`).set({ userId, agentId, botToken });

  return ok({
    agentId,
    botUsername: botInfo.username,
    botFirstName: botInfo.first_name,
    message: `Telegram bot @${botInfo.username} connected to your agent. Users can now chat with your agent on Telegram.`,
  });
}

export async function executeConnectWhatsApp(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const phoneNumberId = params.phone_number_id as string;
  const accessToken = params.access_token as string;
  if (!agentId) return err("agent_id is required");
  if (!phoneNumberId) return err("phone_number_id is required (from Meta Business dashboard)");
  if (!accessToken) return err("access_token is required (from Meta Business dashboard)");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  // Verify access token with Meta
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return err("Invalid WhatsApp access token or phone number ID");
  } catch (e) {
    return err(`Failed to verify WhatsApp credentials: ${(e as Error).message}`);
  }

  const verifyToken = (params.verify_token as string) || "";
  const phoneNumber = (params.phone_number as string) || "";

  // Store connector doc
  await adminDb.doc(`users/${userId}/agents/${agentId}/connectors/whatsapp`).set({
    phoneNumberId,
    accessToken,
    verifyToken,
    phoneNumber,
    enabled: true,
    installedBy: userId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Top-level index
  await adminDb.doc(`whatsappPhones/${phoneNumberId}`).set({ userId, agentId });

  return ok({
    agentId,
    phoneNumberId,
    webhookUrl: "https://kopern.ai/api/whatsapp/webhook",
    verifyEndpoint: `https://kopern.ai/api/whatsapp/webhook (GET with hub.verify_token=${verifyToken || "<your_verify_token>"})`,
    message: "WhatsApp connector activated. Configure the webhook URL in your Meta Business dashboard.",
  });
}

export async function executeConnectSlack(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  if (!agentId) return err("agent_id is required");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  // Slack requires OAuth flow — we can't do it via MCP directly
  // Return the install URL for the user to complete in browser
  const slackClientId = process.env.SLACK_CLIENT_ID;
  if (!slackClientId) {
    return err("Slack integration is not configured on this Kopern instance.");
  }

  const installUrl = `https://kopern.ai/api/slack/install?agentId=${agentId}&userId=${userId}`;

  return ok({
    agentId,
    installUrl,
    message: "Slack requires OAuth authorization. Open the install URL in your browser to connect your Slack workspace. Once authorized, your agent will respond to mentions and DMs.",
    steps: [
      "1. Open the install URL in your browser",
      "2. Select your Slack workspace",
      "3. Authorize the Kopern bot",
      "4. Your agent is now connected to Slack",
    ],
  });
}
