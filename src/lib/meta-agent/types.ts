/** Fully parsed agent specification from the meta-agent LLM output */
export interface AgentSpec {
  name: string;
  domain: string;
  systemPrompt: string;
  modelProvider: string;
  modelId: string;
  thinkingLevel: string;
  builtinTools: string[];
  skills: { name: string; content: string }[];
  tools: { name: string; description: string; parametersSchema: string; executeCode: string }[];
  extensions: { name: string; description: string; code: string }[];
  gradingCases: { name: string; input: string; expected: string; criterionType: string }[];
  purposeGate: { enabled: boolean; question: string; injectInSystemPrompt: boolean } | null;
  tillDone: { enabled: boolean; requireTaskListBeforeExecution: boolean; autoPromptOnIncomplete: boolean; confirmBeforeClear: boolean } | null;
  branding: { themeColor: string; accentColor: string; icon: string } | null;
  rawSpec: string;
}
