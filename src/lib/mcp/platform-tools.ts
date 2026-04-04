// ─── MCP Platform Tools — Vague 1 + Vague 2 Execution Functions ────────────
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
import { generateComplianceReport } from "@/lib/compliance/generate-report";
import { createSessionServer, appendSessionEvents, endSessionServer } from "@/lib/billing/track-usage-server";

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

// ─── Name Resolution ────────────────────────────────────────────────
// Accept agent_name / team_name as alternatives to agent_id / team_id.
// Users don't remember Firestore IDs — names are friendlier.

async function resolveAgentId(userId: string, params: Record<string, unknown>): Promise<string | null> {
  // 1. Explicit agent_name takes priority for name resolution
  const name = params.agent_name as string;
  if (name) {
    const snap = await adminDb
      .collection(`users/${userId}/agents`)
      .where("name", "==", name)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0].id;
  }
  // 2. agent_id — try as Firestore ID first, then as name fallback
  const idOrName = params.agent_id as string;
  if (!idOrName) return null;
  const docSnap = await adminDb.doc(`users/${userId}/agents/${idOrName}`).get();
  if (docSnap.exists) return idOrName;
  // Fallback: treat agent_id value as a name
  const nameSnap = await adminDb
    .collection(`users/${userId}/agents`)
    .where("name", "==", idOrName)
    .limit(1)
    .get();
  return nameSnap.empty ? null : nameSnap.docs[0].id;
}

async function resolveTeamId(userId: string, params: Record<string, unknown>): Promise<string | null> {
  const name = params.team_name as string;
  if (name) {
    const snap = await adminDb
      .collection(`users/${userId}/agentTeams`)
      .where("name", "==", name)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0].id;
  }
  const idOrName = params.team_id as string;
  if (!idOrName) return null;
  const docSnap = await adminDb.doc(`users/${userId}/agentTeams/${idOrName}`).get();
  if (docSnap.exists) return idOrName;
  const nameSnap = await adminDb
    .collection(`users/${userId}/agentTeams`)
    .where("name", "==", idOrName)
    .limit(1)
    .get();
  return nameSnap.empty ? null : nameSnap.docs[0].id;
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
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

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
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

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
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

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
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

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

  // Execute each case — with session logging for observability
  let caseIndex = 0;
  const executeCase = async (inputPrompt: string) => {
    const collector = createEventCollector();
    const messages: LLMMessage[] = [{ role: "user" as const, content: inputPrompt }];
    const caseName = gradingCases[caseIndex]?.name || `Case ${caseIndex + 1}`;
    caseIndex++;

    // Create session for this grading case
    let sessionId = "";
    try {
      sessionId = await createSessionServer(userId, agentId, {
        purpose: `[Grading] ${caseName}`,
        modelUsed: model,
        providerUsed: provider,
      });
    } catch { /* continue without session */ }

    const metrics = await new Promise<AgentRunMetrics>((resolve, reject) => {
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

    // Log session events + close
    if (sessionId) {
      try {
        await appendSessionEvents(userId, agentId, sessionId, [
          { type: "user_message", data: { content: inputPrompt } },
          { type: "assistant_message", data: { content: collector.assistantOutput } },
        ]);
        await endSessionServer(userId, agentId, sessionId);
      } catch { /* best-effort logging */ }
    }

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
  const teamId = await resolveTeamId(userId, params);
  const prompt = params.prompt as string;
  if (!teamId) return err("team_id or team_name is required");
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
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

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
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

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
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

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

// ═══════════════════════════════════════════════════════════════════════
// ─── VAGUE 2 — Ecosystem Tools ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

// ─── Pipelines ─────────────────────────────────────────────────────

export async function executeCreatePipeline(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const name = params.name as string;
  if (!agentId) return err("agent_id is required");
  if (!name) return err("name is required");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  const steps = params.steps as { agent_id: string; role: string; order?: number; input_mapping?: string; custom_input_template?: string; continue_on_error?: boolean }[];
  if (!steps?.length) return err("steps is required (array of pipeline steps)");

  // Verify all step agents exist
  for (const step of steps) {
    const snap = await adminDb.doc(`users/${userId}/agents/${step.agent_id}`).get();
    if (!snap.exists) return err(`Step agent ${step.agent_id} not found`);
  }

  const pipelineSteps = steps.map((s, i) => {
    const step: Record<string, unknown> = {
      agentId: s.agent_id,
      role: s.role || "processor",
      order: s.order ?? i,
      inputMapping: (s.input_mapping as "previous_output" | "original_input" | "custom") || "previous_output",
      continueOnError: s.continue_on_error ?? false,
    };
    if (s.custom_input_template) step.customInputTemplate = s.custom_input_template;
    return step;
  });

  const ref = await adminDb.collection(`users/${userId}/agents/${agentId}/pipelines`).add({
    name,
    description: (params.description as string) || "",
    steps: pipelineSteps,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return ok({
    pipelineId: ref.id,
    agentId,
    name,
    stepsCount: pipelineSteps.length,
    message: `Pipeline "${name}" created with ${pipelineSteps.length} steps.`,
  });
}

export async function executeRunPipeline(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const pipelineId = params.pipeline_id as string;
  const prompt = params.prompt as string;
  if (!agentId) return err("agent_id is required");
  if (!pipelineId) return err("pipeline_id is required");
  if (!prompt) return err("prompt is required");

  const pipelineSnap = await adminDb.doc(`users/${userId}/agents/${agentId}/pipelines/${pipelineId}`).get();
  if (!pipelineSnap.exists) return err(`Pipeline ${pipelineId} not found`);

  const pipeline = pipelineSnap.data()!;
  const steps = (pipeline.steps as { agentId: string; role: string; order: number; inputMapping: string; customInputTemplate?: string; continueOnError: boolean }[])
    .sort((a, b) => a.order - b.order);

  if (!steps.length) return err("Pipeline has no steps");

  const results: { stepIndex: number; agentId: string; role: string; output: string; tokens: { input: number; output: number } }[] = [];
  let previousOutput = "";

  for (const [i, step] of steps.entries()) {
    // Determine input
    let stepInput: string;
    if (step.inputMapping === "original_input") {
      stepInput = prompt;
    } else if (step.inputMapping === "custom" && step.customInputTemplate) {
      stepInput = step.customInputTemplate
        .replace("{{original_input}}", prompt)
        .replace("{{previous_output}}", previousOutput);
    } else {
      stepInput = i === 0 ? prompt : `Previous step output:\n\n${previousOutput}\n\nOriginal request: ${prompt}`;
    }

    // Load step agent
    const stepAgentSnap = await adminDb.doc(`users/${userId}/agents/${step.agentId}`).get();
    if (!stepAgentSnap.exists) {
      if (step.continueOnError) { results.push({ stepIndex: i, agentId: step.agentId, role: step.role, output: `[Error: Agent ${step.agentId} not found]`, tokens: { input: 0, output: 0 } }); continue; }
      return err(`Step agent ${step.agentId} not found`);
    }
    const stepAgent = stepAgentSnap.data()!;

    // Load skills
    let systemPrompt = (stepAgent.systemPrompt as string) || "";
    const skillsSnap = await adminDb.collection(`users/${userId}/agents/${step.agentId}/skills`).get();
    if (!skillsSnap.empty) {
      const xml = skillsSnap.docs.map(d => `<skill name="${d.data().name}">\n${d.data().content}\n</skill>`).join("\n\n");
      systemPrompt += `\n\n<skills>\n${xml}\n</skills>`;
    }

    const apiKeys = await resolveProviderKeys(userId, stepAgent.modelProvider as string);
    let output = "";

    try {
      const metrics = await new Promise<AgentRunMetrics>((resolve, reject) => {
        runAgentWithTools(
          {
            provider: stepAgent.modelProvider as string,
            model: stepAgent.modelId as string,
            systemPrompt,
            messages: [{ role: "user" as const, content: stepInput }],
            userId,
            agentId: step.agentId,
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

      results.push({ stepIndex: i, agentId: step.agentId, role: step.role, output, tokens: { input: metrics.inputTokens, output: metrics.outputTokens } });
      previousOutput = output;
    } catch (e) {
      if (step.continueOnError) {
        results.push({ stepIndex: i, agentId: step.agentId, role: step.role, output: `[Error: ${(e as Error).message}]`, tokens: { input: 0, output: 0 } });
      } else {
        return err(`Pipeline step ${i} failed: ${(e as Error).message}`);
      }
    }
  }

  const totalTokens = results.reduce((acc, r) => ({ input: acc.input + r.tokens.input, output: acc.output + r.tokens.output }), { input: 0, output: 0 });

  return ok({
    pipelineId,
    pipelineName: pipeline.name,
    stepsExecuted: results.length,
    results: results.map(r => ({ ...r, output: r.output.slice(0, 3000) })),
    totalTokens,
    finalOutput: results[results.length - 1]?.output || "",
  });
}

// ─── Sessions ──────────────────────────────────────────────────────

export async function executeListSessions(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  const limit = Math.min((params.limit as number) || 20, 50);

  const snap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/sessions`)
    .orderBy("startedAt", "desc")
    .limit(limit)
    .get();

  const sessions = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      purpose: data.purpose || null,
      source: data.source || "unknown",
      startedAt: data.startedAt?.toDate?.()?.toISOString?.() || null,
      endedAt: data.endedAt?.toDate?.()?.toISOString?.() || null,
      totalTokensIn: data.totalTokensIn || 0,
      totalTokensOut: data.totalTokensOut || 0,
      totalCost: data.totalCost || 0,
      toolCallCount: data.toolCallCount || 0,
      messageCount: data.messageCount || 0,
      modelUsed: data.modelUsed || null,
    };
  });

  return ok({ count: sessions.length, agentId, sessions });
}

export async function executeGetSession(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const sessionId = params.session_id as string;
  if (!agentId) return err("agent_id is required");
  if (!sessionId) return err("session_id is required");

  const snap = await adminDb.doc(`users/${userId}/agents/${agentId}/sessions/${sessionId}`).get();
  if (!snap.exists) return err(`Session ${sessionId} not found`);

  const data = snap.data()!;
  const events = (data.events || []).map((e: Record<string, unknown>) => ({
    type: e.type,
    timestamp: (e.timestamp as { toDate?: () => Date })?.toDate?.()?.toISOString?.() || null,
    data: e.data,
  }));

  return ok({
    id: sessionId,
    agentId,
    purpose: data.purpose || null,
    source: data.source || "unknown",
    startedAt: data.startedAt?.toDate?.()?.toISOString?.() || null,
    endedAt: data.endedAt?.toDate?.()?.toISOString?.() || null,
    totalTokensIn: data.totalTokensIn || 0,
    totalTokensOut: data.totalTokensOut || 0,
    totalCost: data.totalCost || 0,
    toolCallCount: data.toolCallCount || 0,
    messageCount: data.messageCount || 0,
    modelUsed: data.modelUsed || null,
    providerUsed: data.providerUsed || null,
    events: events.slice(0, 100), // Cap at 100 events to avoid huge payloads
  });
}

// ─── Memory ────────────────────────────────────────────────────────

export async function executeManageMemory(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const action = params.action as string;
  if (!agentId) return err("agent_id is required");
  if (!action) return err("action is required: remember, recall, forget, list");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  const memoryCol = `users/${userId}/agents/${agentId}/memory`;

  switch (action) {
    case "remember": {
      const key = params.key as string;
      const value = params.value as string;
      const category = (params.category as string) || "custom";
      if (!key) return err("key is required for remember");
      if (!value) return err("value is required for remember");

      const docId = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
      await adminDb.doc(`${memoryCol}/${docId}`).set({
        key,
        value,
        category,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastAccessedAt: FieldValue.serverTimestamp(),
        accessCount: 1,
      }, { merge: false });

      return ok({ action: "remember", key, message: `Memory "${key}" saved.` });
    }

    case "recall": {
      const query = params.query as string;
      if (!query) return err("query is required for recall");

      const snap = await adminDb.collection(memoryCol).get();
      const keywords = query.toLowerCase().split(/\s+/);
      const scored = snap.docs
        .map(d => {
          const data = d.data();
          const text = `${data.key} ${data.value}`.toLowerCase();
          const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
          return { id: d.id, key: data.key, value: data.value, category: data.category, score };
        })
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return ok({ action: "recall", query, count: scored.length, memories: scored });
    }

    case "forget": {
      const key = params.key as string;
      if (!key) return err("key is required for forget");

      const docId = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
      const snap = await adminDb.doc(`${memoryCol}/${docId}`).get();
      if (!snap.exists) return err(`Memory "${key}" not found`);

      await adminDb.doc(`${memoryCol}/${docId}`).delete();
      return ok({ action: "forget", key, message: `Memory "${key}" deleted.` });
    }

    case "list": {
      const snap = await adminDb.collection(memoryCol)
        .orderBy("lastAccessedAt", "desc")
        .limit(50)
        .get();

      const memories = snap.docs.map(d => {
        const data = d.data();
        return { key: data.key, value: data.value, category: data.category || "custom", accessCount: data.accessCount || 0 };
      });

      return ok({ action: "list", count: memories.length, memories });
    }

    default:
      return err(`Unknown action "${action}". Must be one of: remember, recall, forget, list`);
  }
}

// ─── Compliance Report ─────────────────────────────────────────────

export async function executeComplianceReport(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  try {
    const report = await generateComplianceReport(userId, agentId);
    return ok(report);
  } catch (e) {
    return err(`Compliance report error: ${(e as Error).message}`);
  }
}

// ─── Grading Results ───────────────────────────────────────────────

export async function executeGetGradingResults(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const suiteId = params.suite_id as string;
  const runId = params.run_id as string;
  if (!agentId) return err("agent_id is required");
  if (!suiteId) return err("suite_id is required");
  if (!runId) return err("run_id is required");

  const runSnap = await adminDb.doc(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}`).get();
  if (!runSnap.exists) return err(`Grading run ${runId} not found`);

  const runData = runSnap.data()!;

  // Load detailed results
  const resultsSnap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}/results`)
    .get();

  const results = resultsSnap.docs.map(d => {
    const data = d.data();
    return {
      caseId: data.caseId,
      caseName: data.caseName || data.caseId,
      passed: data.passed,
      score: Math.round((data.score || 0) * 100) / 100,
      agentOutput: (data.agentOutput || "").slice(0, 500),
      toolCalls: (data.toolCalls || []).length,
      durationMs: data.durationMs || 0,
      criteriaResults: (data.criteriaResults || []).map((cr: Record<string, unknown>) => ({
        type: cr.criterionType,
        passed: cr.passed,
        score: Math.round((cr.score as number || 0) * 100) / 100,
        message: cr.message,
      })),
    };
  });

  return ok({
    runId,
    suiteId,
    agentId,
    status: runData.status,
    score: runData.score != null ? Math.round(runData.score * 100) / 100 : null,
    totalCases: runData.totalCases,
    passedCases: runData.passedCases,
    agentVersion: runData.agentVersion,
    completedAt: runData.completedAt?.toDate?.()?.toISOString?.() || null,
    improvementSummary: runData.improvementSummary || null,
    improvementNotes: runData.improvementNotes || [],
    results,
  });
}

export async function executeListGradingRuns(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const suiteId = params.suite_id as string;
  if (!agentId) return err("agent_id is required");
  if (!suiteId) return err("suite_id is required");

  const snap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs`)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const runs = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      status: data.status,
      score: data.score != null ? Math.round(data.score * 100) / 100 : null,
      totalCases: data.totalCases,
      passedCases: data.passedCases,
      agentVersion: data.agentVersion,
      completedAt: data.completedAt?.toDate?.()?.toISOString?.() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
    };
  });

  return ok({ agentId, suiteId, count: runs.length, runs });
}

// ─── Service Connectors (Email/Calendar) ───────────────────────────

export async function executeConnectEmail(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const provider = params.provider as string;
  if (!agentId) return err("agent_id is required");
  if (!provider || !["google", "microsoft"].includes(provider)) return err("provider must be 'google' or 'microsoft'");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  // Service connectors require OAuth flow in the browser
  const oauthUrl = provider === "google"
    ? `https://kopern.ai/api/oauth/google?userId=${userId}&agentId=${agentId}&scope=email`
    : `https://kopern.ai/api/oauth/microsoft?userId=${userId}&agentId=${agentId}&scope=email`;

  // Enable the builtin tool
  const currentBuiltins = (agentSnap.data()!.builtinTools as string[]) || [];
  if (!currentBuiltins.includes("service_email")) {
    await adminDb.doc(`users/${userId}/agents/${agentId}`).update({
      builtinTools: [...currentBuiltins, "service_email"],
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return ok({
    agentId,
    provider,
    oauthUrl,
    builtinEnabled: "service_email",
    message: `Open the OAuth URL in your browser to connect ${provider === "google" ? "Gmail" : "Outlook"}. The "service_email" builtin tool has been enabled on the agent.`,
    tools: ["read_emails", "send_email", "reply_email"],
  });
}

export async function executeConnectCalendar(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = params.agent_id as string;
  const provider = params.provider as string;
  if (!agentId) return err("agent_id is required");
  if (!provider || !["google", "microsoft"].includes(provider)) return err("provider must be 'google' or 'microsoft'");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  const oauthUrl = provider === "google"
    ? `https://kopern.ai/api/oauth/google?userId=${userId}&agentId=${agentId}&scope=calendar`
    : `https://kopern.ai/api/oauth/microsoft?userId=${userId}&agentId=${agentId}&scope=calendar`;

  const currentBuiltins = (agentSnap.data()!.builtinTools as string[]) || [];
  if (!currentBuiltins.includes("service_calendar")) {
    await adminDb.doc(`users/${userId}/agents/${agentId}`).update({
      builtinTools: [...currentBuiltins, "service_calendar"],
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return ok({
    agentId,
    provider,
    oauthUrl,
    builtinEnabled: "service_calendar",
    message: `Open the OAuth URL in your browser to connect ${provider === "google" ? "Google Calendar" : "Microsoft Calendar"}. The "service_calendar" builtin tool has been enabled on the agent.`,
    tools: ["list_events", "check_availability", "create_event", "update_event", "cancel_event"],
  });
}

// ─── Usage ─────────────────────────────────────────────────────────

export async function executeGetUsage(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const yearMonth = (params.year_month as string) || new Date().toISOString().slice(0, 7);
  const includeHistory = params.include_history === true;

  if (includeHistory) {
    const snap = await adminDb.collection(`users/${userId}/usage`)
      .orderBy("__name__", "desc")
      .limit(6)
      .get();

    const history = snap.docs.map(d => {
      const data = d.data();
      return {
        yearMonth: d.id,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        totalCost: Math.round((data.totalCost || 0) * 1000) / 1000,
        requestCount: data.requestCount || 0,
        gradingRuns: data.gradingRuns || 0,
        agentBreakdown: data.agentBreakdown || {},
      };
    });

    return ok({ userId, months: history.length, history });
  }

  const snap = await adminDb.doc(`users/${userId}/usage/${yearMonth}`).get();
  if (!snap.exists) return ok({ userId, yearMonth, inputTokens: 0, outputTokens: 0, totalCost: 0, requestCount: 0, message: "No usage recorded for this period." });

  const data = snap.data()!;
  return ok({
    userId,
    yearMonth,
    inputTokens: data.inputTokens || 0,
    outputTokens: data.outputTokens || 0,
    totalCost: Math.round((data.totalCost || 0) * 1000) / 1000,
    requestCount: data.requestCount || 0,
    gradingRuns: data.gradingRuns || 0,
    agentBreakdown: data.agentBreakdown || {},
  });
}

// ─── Export / Import Agent ─────────────────────────────────────────

export async function executeExportAgent(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const agentId = await resolveAgentId(userId, params);
  if (!agentId) return err("agent_id or agent_name is required");

  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) return err(`Agent ${agentId} not found`);

  const agentData = agentSnap.data()!;

  // Load subcollections in parallel
  const [skillsSnap, toolsSnap, extensionsSnap, suitesSnap] = await Promise.all([
    adminDb.collection(`users/${userId}/agents/${agentId}/skills`).get(),
    adminDb.collection(`users/${userId}/agents/${agentId}/tools`).get(),
    adminDb.collection(`users/${userId}/agents/${agentId}/extensions`).get(),
    adminDb.collection(`users/${userId}/agents/${agentId}/gradingSuites`).get(),
  ]);

  const skills = skillsSnap.docs.map(d => ({ name: d.data().name, description: d.data().description, content: d.data().content }));
  const tools = toolsSnap.docs.map(d => ({ name: d.data().name, label: d.data().label, description: d.data().description, parametersSchema: d.data().parametersSchema, executeCode: d.data().executeCode }));
  const extensions = extensionsSnap.docs.map(d => ({ name: d.data().name, description: d.data().description, code: d.data().code, events: d.data().events, blocking: d.data().blocking, enabled: d.data().enabled }));

  // Load grading suites with cases
  const gradingSuites = [];
  for (const suiteDoc of suitesSnap.docs) {
    const casesSnap = await suiteDoc.ref.collection("cases").orderBy("orderIndex").get();
    gradingSuites.push({
      name: suiteDoc.data().name,
      description: suiteDoc.data().description,
      cases: casesSnap.docs.map(c => ({
        name: c.data().name,
        inputPrompt: c.data().inputPrompt,
        expectedBehavior: c.data().expectedBehavior,
        orderIndex: c.data().orderIndex,
        criteria: c.data().criteria || [],
      })),
    });
  }

  const exportData = {
    _kopernExport: true,
    _version: 1,
    _exportedAt: new Date().toISOString(),
    agent: {
      name: agentData.name,
      description: agentData.description,
      domain: agentData.domain,
      systemPrompt: agentData.systemPrompt,
      modelProvider: agentData.modelProvider,
      modelId: agentData.modelId,
      thinkingLevel: agentData.thinkingLevel || "off",
      builtinTools: agentData.builtinTools || [],
      toolApprovalPolicy: agentData.toolApprovalPolicy || "auto",
      riskLevel: agentData.riskLevel || "minimal",
      memoryConfig: agentData.memoryConfig || null,
      templateId: agentData.templateId || null,
      templateVariables: agentData.templateVariables || null,
    },
    skills,
    tools,
    extensions,
    gradingSuites,
  };

  return ok(exportData);
}

export async function executeImportAgent(
  userId: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const data = params.data as Record<string, unknown>;
  if (!data) return err("data is required (the exported JSON object)");
  if (!data._kopernExport) return err("Invalid export format. Must be a Kopern agent export.");

  const agent = data.agent as Record<string, unknown>;
  if (!agent?.name || !agent?.systemPrompt) return err("Export data missing agent name or systemPrompt");

  // Create agent
  const ref = await adminDb.collection(`users/${userId}/agents`).add({
    name: `${agent.name} (imported)`,
    description: agent.description || "",
    domain: agent.domain || "other",
    systemPrompt: agent.systemPrompt,
    modelProvider: agent.modelProvider || "anthropic",
    modelId: agent.modelId || "claude-sonnet-4-6",
    thinkingLevel: agent.thinkingLevel || "off",
    builtinTools: agent.builtinTools || [],
    connectedRepos: [],
    version: 1,
    isPublished: false,
    latestGradingScore: null,
    purposeGate: null,
    tillDone: null,
    branding: null,
    toolOverrides: [],
    toolApprovalPolicy: agent.toolApprovalPolicy || "auto",
    riskLevel: agent.riskLevel || "minimal",
    memoryConfig: agent.memoryConfig || null,
    templateId: agent.templateId || null,
    templateVariables: agent.templateVariables || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const agentId = ref.id;

  const batch = adminDb.batch();
  let skillCount = 0, toolCount = 0, extCount = 0, suiteCount = 0, caseCount = 0;

  // Skills
  const skills = (data.skills as { name: string; description: string; content: string }[]) || [];
  for (const s of skills) {
    const sRef = adminDb.collection(`users/${userId}/agents/${agentId}/skills`).doc();
    batch.set(sRef, { name: s.name, description: s.description || s.name, content: s.content, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    skillCount++;
  }

  // Tools
  const tools = (data.tools as { name: string; label: string; description: string; parametersSchema: unknown; executeCode: string }[]) || [];
  for (const t of tools) {
    const tRef = adminDb.collection(`users/${userId}/agents/${agentId}/tools`).doc();
    batch.set(tRef, { name: t.name, label: t.label || t.name, description: t.description, parametersSchema: t.parametersSchema, executeCode: t.executeCode, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    toolCount++;
  }

  // Extensions
  const extensions = (data.extensions as { name: string; description: string; code: string; events: string[]; blocking: boolean; enabled: boolean }[]) || [];
  for (const e of extensions) {
    const eRef = adminDb.collection(`users/${userId}/agents/${agentId}/extensions`).doc();
    batch.set(eRef, { name: e.name, description: e.description, code: e.code, events: e.events || [], blocking: e.blocking ?? false, enabled: e.enabled ?? true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    extCount++;
  }

  // Grading suites
  const gradingSuites = (data.gradingSuites as { name: string; description: string; cases: { name: string; inputPrompt: string; expectedBehavior: string; orderIndex: number; criteria: unknown[] }[] }[]) || [];
  for (const suite of gradingSuites) {
    const suiteRef = adminDb.collection(`users/${userId}/agents/${agentId}/gradingSuites`).doc();
    batch.set(suiteRef, { name: suite.name, description: suite.description || "", createdAt: FieldValue.serverTimestamp() });
    suiteCount++;
    for (const c of suite.cases || []) {
      const cRef = suiteRef.collection("cases").doc();
      batch.set(cRef, { name: c.name, inputPrompt: c.inputPrompt, expectedBehavior: c.expectedBehavior, orderIndex: c.orderIndex, criteria: c.criteria || [], createdAt: FieldValue.serverTimestamp() });
      caseCount++;
    }
  }

  await batch.commit();

  return ok({
    agentId,
    name: `${agent.name} (imported)`,
    imported: { skills: skillCount, tools: toolCount, extensions: extCount, gradingSuites: suiteCount, gradingCases: caseCount },
    message: `Agent "${agent.name}" imported successfully with ${skillCount} skills, ${toolCount} tools, ${extCount} extensions, ${suiteCount} grading suites (${caseCount} cases).`,
  });
}
