// Agent Factory — bridge between Firestore config and pi-mono runtime
// MVP: creates a configuration object that the API route uses to instantiate an agent session

import { type AgentDoc, type SkillDoc, type ToolDoc } from "@/lib/firebase/firestore";

export interface AgentConfig {
  systemPrompt: string;
  modelProvider: string;
  modelId: string;
  thinkingLevel: string;
  builtinTools: string[];
  skills: SkillContent[];
  customTools: CustomToolDef[];
}

export interface SkillContent {
  name: string;
  content: string;
}

export interface CustomToolDef {
  name: string;
  label: string;
  description: string;
  parametersSchema: string;
  executeCode: string;
}

export function buildAgentConfig(
  agent: AgentDoc,
  skills: (SkillDoc & { id: string })[],
  tools: (ToolDoc & { id: string })[]
): AgentConfig {
  return {
    systemPrompt: agent.systemPrompt,
    modelProvider: agent.modelProvider,
    modelId: agent.modelId,
    thinkingLevel: agent.thinkingLevel,
    builtinTools: agent.builtinTools,
    skills: skills.map((s) => ({ name: s.name, content: s.content })),
    customTools: tools.map((t) => ({
      name: t.name,
      label: t.label,
      description: t.description,
      parametersSchema: t.parametersSchema,
      executeCode: t.executeCode,
    })),
  };
}

export function buildSystemPromptWithSkills(
  basePrompt: string,
  skills: SkillContent[]
): string {
  if (skills.length === 0) return basePrompt;

  const skillsSection = skills
    .map(
      (s) =>
        `<skill name="${s.name}">\n${s.content}\n</skill>`
    )
    .join("\n\n");

  return `${basePrompt}\n\n<skills>\n${skillsSection}\n</skills>`;
}
