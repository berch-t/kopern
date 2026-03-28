import { addDoc, serverTimestamp } from "firebase/firestore";
import {
  agentsCollection,
  skillsCollection,
  toolsCollection,
  gradingSuitesCollection,
  gradingCasesCollection,
  type AgentDoc,
  type SkillDoc,
  type ToolDoc,
  type GradingSuiteDoc,
  type GradingCaseDoc,
} from "@/lib/firebase/firestore";
import { hydratePrompt, extractAgentName } from "@/lib/templates/hydrate";
import type { VerticalTemplate } from "@/data/vertical-templates";


/**
 * Deploy a vertical template as a fully configured agent in one shot.
 * Creates: agent + skills + tools + grading suite + grading cases.
 */
export async function deployFromTemplate(
  userId: string,
  template: VerticalTemplate,
  answers: Record<string, string>,
  locale: string,
  extraBuiltinTools?: string[]
): Promise<string> {
  const agentName = extractAgentName(template, answers, locale);
  const systemPrompt = hydratePrompt(template.systemPromptTemplate, answers);
  const description = locale === "fr" ? template.descriptionFr : template.description;

  // 1. Create the agent
  const agentRef = await addDoc(agentsCollection(userId), {
    name: agentName,
    description,
    domain: template.domain,
    systemPrompt,
    modelProvider: template.modelProvider,
    modelId: template.modelId,
    thinkingLevel: "off",
    builtinTools: extraBuiltinTools || [],
    connectedRepos: [],
    version: 1,
    isPublished: false,
    latestGradingScore: null,
    purposeGate: null,
    tillDone: null,
    branding: null,
    toolOverrides: [],
    templateId: template.slug,
    templateVariables: answers,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as unknown as AgentDoc);

  const agentId = agentRef.id;

  // 2. Create skills
  const skillPromises = template.skills.map((skill) =>
    addDoc(skillsCollection(userId, agentId), {
      name: skill.name,
      description: `${template.domain} domain knowledge`,
      content: skill.content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as unknown as SkillDoc)
  );

  // 3. Create tools
  const toolPromises = template.tools.map((tool) =>
    addDoc(toolsCollection(userId, agentId), {
      name: tool.name,
      label: tool.name.replace(/_/g, " "),
      description: tool.description,
      parametersSchema: tool.params,
      executeCode: tool.executeCode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as unknown as ToolDoc)
  );

  // 4. Create grading suite + cases
  const suiteRef = await addDoc(gradingSuitesCollection(userId, agentId), {
    name: locale === "fr" ? "Suite de tests auto-générée" : "Auto-generated test suite",
    description:
      locale === "fr"
        ? `Tests de qualité pour ${agentName}`
        : `Quality tests for ${agentName}`,
    createdAt: serverTimestamp(),
  } as unknown as GradingSuiteDoc);

  const casePromises = template.gradingSuite.map((tc, i) =>
    addDoc(gradingCasesCollection(userId, agentId, suiteRef.id), {
      name: tc.caseName,
      inputPrompt: tc.input,
      expectedBehavior: tc.expectedBehavior,
      orderIndex: i,
      criteria: [],
      createdAt: serverTimestamp(),
    } as unknown as GradingCaseDoc)
  );

  // Fire all in parallel
  await Promise.all([...skillPromises, ...toolPromises, ...casePromises]);

  return agentId;
}
