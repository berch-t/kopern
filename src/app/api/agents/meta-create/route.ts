import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";
import { META_AGENT_SYSTEM_PROMPT } from "@/data/meta-agent-template";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import type { AgentSpec } from "@/lib/meta-agent/types";

interface MetaCreateBody {
  description: string;
  modelProvider: string;
  modelId: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as MetaCreateBody;
  const { description, modelProvider, modelId, userId } = body;

  if (!description || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Description must be at least 10 characters" },
      { status: 400 }
    );
  }

  // Enforce plan: meta-agent requires Pro+ (skip for unauthenticated hero usage)
  if (userId) {
    const planCheck = await checkPlanLimits(userId, "meta_agent");
    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: planCheck.reason, plan: planCheck.plan },
        { status: 403 }
      );
    }
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      send("status", { status: "analyzing" });

      const messages: LLMMessage[] = [
        {
          role: "user",
          content: `Create a complete agent specification for the following request:\n\n${description}\n\nProvide the full specification in the structured format described in your instructions. Include ALL sections: name, domain, model, thinking level, built-in tools, system prompt, skills, tools, extensions, grading suite, purpose gate, tillDone, and branding. Be specific and production-ready.`,
        },
      ];

      let fullResponse = "";

      await streamLLM(
        {
          provider: modelProvider || "anthropic",
          model: modelId || "claude-sonnet-4-6",
          systemPrompt: META_AGENT_SYSTEM_PROMPT,
          messages,
        },
        {
          onToken: (text) => {
            fullResponse += text;
            send("token", { text });
          },
          onDone: () => {
            const spec = parseAgentSpec(fullResponse);
            send("spec", spec);
            send("done", { success: true });
            close();
          },
          onError: (error) => {
            send("error", { message: error.message });
            close();
          },
        }
      );
    } catch (err) {
      send("error", { message: (err as Error).message });
      close();
    }
  })();

  return sseResponse(stream);
}

// ---------------------------------------------------------------------------
// Section-based parser — extracts ALL Kopern agent configuration
// ---------------------------------------------------------------------------

// Re-export for backward compat
type ParsedSpec = AgentSpec;

/**
 * Split markdown text into sections by ## or ### headings.
 */
function splitSections(text: string): { key: string; inline: string; body: string }[] {
  const result: { key: string; inline: string; body: string }[] = [];

  const headingPattern = /^(#{2,4})\s+(.+)$/gm;
  const headings: { text: string; start: number; matchEnd: number }[] = [];
  let m;
  while ((m = headingPattern.exec(text)) !== null) {
    headings.push({
      text: m[2],
      start: m.index,
      matchEnd: m.index + m[0].length,
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const bodyStart = h.matchEnd;
    const bodyEnd = i + 1 < headings.length ? headings[i + 1].start : text.length;
    const body = text.slice(bodyStart, bodyEnd).trim();

    const colonIdx = h.text.indexOf(":");
    const key = (colonIdx >= 0 ? h.text.slice(0, colonIdx) : h.text).trim().toLowerCase();
    const inline = colonIdx >= 0 ? h.text.slice(colonIdx + 1).trim() : "";

    result.push({ key, inline, body });
  }

  return result;
}

function findSection(sections: { key: string; inline: string; body: string }[], keywords: string[]) {
  for (const kw of keywords) {
    for (const s of sections) {
      if (s.key.includes(kw)) return s;
    }
  }
  return null;
}

function parseAgentSpec(response: string): ParsedSpec {
  const sections = splitSections(response);

  // --- Name ---
  const nameSection = findSection(sections, ["agent name", "name", "nom de l'agent", "nom"]);
  const name = cleanInline(nameSection?.inline || nameSection?.body.split("\n")[0] || "") || "New Agent";

  // --- Domain ---
  const domainSection = findSection(sections, ["domain", "domaine"]);
  const domain = cleanInline(domainSection?.inline || domainSection?.body.split("\n")[0] || "") || "other";

  // --- Model Provider ---
  const providerSection = findSection(sections, ["model provider", "fournisseur"]);
  const modelProvider = normalizeProvider(
    cleanInline(providerSection?.inline || providerSection?.body.split("\n")[0] || "")
  );

  // --- Model ID ---
  const modelIdSection = findSection(sections, ["model id", "modèle", "model identifier"]);
  const modelId = cleanInline(modelIdSection?.inline || modelIdSection?.body.split("\n")[0] || "")
    || "claude-sonnet-4-6";

  // --- Thinking Level ---
  const thinkingSection = findSection(sections, ["thinking level", "thinking", "niveau de réflexion"]);
  const thinkingLevel = normalizeThinking(
    cleanInline(thinkingSection?.inline || thinkingSection?.body.split("\n")[0] || "")
  );

  // --- Built-in Tools ---
  const builtinSection = findSection(sections, ["built-in tools", "builtin tools", "outils intégrés"]);
  const builtinTools = parseBuiltinTools(
    cleanInline(builtinSection?.inline || builtinSection?.body.split("\n")[0] || "")
  );

  // --- System Prompt ---
  const promptSection = findSection(sections, ["system prompt", "prompt système", "prompt systeme", "prompt syst"]);
  let systemPrompt = "";
  if (promptSection) {
    systemPrompt = extractFromCodeBlock(promptSection.body) || promptSection.body;
  }
  if (!systemPrompt) {
    systemPrompt = response.slice(0, 500);
  }

  // --- Skills ---
  const skills = parseSkills(sections);

  // --- Tools ---
  const tools = parseTools(sections);

  // --- Extensions ---
  const extensions = parseExtensions(sections);

  // --- Grading ---
  const gradingCases = parseGrading(sections);

  // --- Purpose Gate ---
  const purposeGate = parsePurposeGate(sections);

  // --- TillDone ---
  const tillDone = parseTillDone(sections);

  // --- Branding ---
  const branding = parseBranding(sections);

  return {
    name, domain, systemPrompt, modelProvider, modelId, thinkingLevel, builtinTools,
    skills, tools, extensions, gradingCases,
    purposeGate, tillDone, branding,
    rawSpec: response,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanInline(s: string): string {
  return s.replace(/^\*+|\*+$/g, "").replace(/^`+|`+$/g, "").replace(/^#+\s*/, "").trim();
}

function extractFromCodeBlock(text: string): string | null {
  const match = text.match(/```(?:\w*)\s*\n([\s\S]*?)\n```/);
  return match ? match[1].trim() : null;
}

function normalizeProvider(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("openai") || lower.includes("gpt")) return "openai";
  if (lower.includes("google") || lower.includes("gemini")) return "google";
  return "anthropic";
}

function normalizeThinking(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("high") || lower.includes("élevé")) return "high";
  if (lower.includes("medium") || lower.includes("moyen")) return "medium";
  if (lower.includes("low") || lower.includes("bas") || lower.includes("faible")) return "low";
  if (lower.includes("minimal")) return "minimal";
  return "off";
}

function parseBuiltinTools(raw: string): string[] {
  const lower = raw.toLowerCase();
  if (lower === "none" || lower === "aucun" || lower === "[]" || !lower) return [];
  const tools: string[] = [];
  if (lower.includes("read")) tools.push("read");
  if (lower.includes("bash") || lower.includes("shell") || lower.includes("exec")) tools.push("bash");
  return tools;
}

// ---------------------------------------------------------------------------
// Skills parser
// ---------------------------------------------------------------------------

function parseSkills(sections: { key: string; inline: string; body: string }[]): { name: string; content: string }[] {
  const skills: { name: string; content: string }[] = [];

  const skillSections = sections.filter((s) => s.key.includes("skill"));
  if (skillSections.length === 0) return skills;

  const mainSection = skillSections.find((s) => s.key === "skills" || s.key === "skill");
  if (mainSection) {
    const subSkills = skillSections.filter((s) => s !== mainSection);
    if (subSkills.length > 0) {
      for (const sub of subSkills) {
        const name = cleanInline(sub.inline || sub.key.replace("skill", "").replace(/[^a-z0-9\s-]/g, "").trim()) || sub.key;
        const content = extractFromCodeBlock(sub.body) || sub.body;
        if (content) skills.push({ name, content });
      }
    }

    if (skills.length === 0 && mainSection.body) {
      const boldPattern = /\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*\*\*[^*]|\n#{2,}|$)/g;
      let match;
      while ((match = boldPattern.exec(mainSection.body)) !== null) {
        const sName = match[1].trim();
        const sContent = match[2].trim();
        if (sName && sContent) skills.push({ name: sName, content: sContent });
      }
    }

    if (skills.length === 0 && mainSection.body) {
      const itemPattern = /(?:^|\n)\d+\.\s+\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\d+\.\s+\*\*|\n#{2,}|$)/g;
      let match;
      while ((match = itemPattern.exec(mainSection.body)) !== null) {
        const sName = match[1].trim();
        const sContent = match[2].trim();
        if (sName && sContent) skills.push({ name: sName, content: sContent });
      }
    }

    if (skills.length === 0 && mainSection.body.length > 20) {
      const sName = cleanInline(mainSection.inline) || "Main Skill";
      skills.push({ name: sName, content: extractFromCodeBlock(mainSection.body) || mainSection.body });
    }
  }

  return skills;
}

// ---------------------------------------------------------------------------
// Tools parser
// ---------------------------------------------------------------------------

function parseTools(sections: { key: string; inline: string; body: string }[]): { name: string; description: string; parametersSchema: string; executeCode: string }[] {
  const tools: { name: string; description: string; parametersSchema: string; executeCode: string }[] = [];

  const toolSections = sections.filter((s) =>
    (s.key.includes("tool") || s.key.includes("outil")) &&
    !s.key.includes("override") && !s.key.includes("built-in") && !s.key.includes("builtin")
  );
  if (toolSections.length === 0) return tools;

  for (const section of toolSections) {
    const blocks = section.body.split(/\n(?=\*\*[^*]+\*\*)/);

    for (const block of blocks) {
      const nameMatch = block.match(/\*\*(.+?)\*\*/);
      if (!nameMatch) continue;

      const name = nameMatch[1].trim();
      const descMatch = block.match(/\*\*.*?\*\*[:\s]*([^\n]*)/);
      const description = descMatch?.[1]?.trim() || name;

      const codeBlocks = [...block.matchAll(/```(\w*)\s*\n([\s\S]*?)\n```/g)];

      let parametersSchema = '{"type":"object","properties":{}}';
      let executeCode = "result = JSON.stringify({ error: 'Tool code was not generated. Please edit this tool and add working JavaScript code.', tool: '" + name.replace(/'/g, "") + "' });";

      for (const cb of codeBlocks) {
        const lang = cb[1].toLowerCase();
        const code = cb[2].trim();

        if (lang === "json" || (!lang && isJSON(code))) {
          parametersSchema = code;
        } else {
          executeCode = code;
        }
      }

      tools.push({
        name: name.replace(/\s+/g, "_").toLowerCase(),
        description,
        parametersSchema,
        executeCode,
      });
    }
  }

  return tools;
}

function isJSON(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Extensions parser
// ---------------------------------------------------------------------------

function parseExtensions(sections: { key: string; inline: string; body: string }[]): { name: string; description: string; code: string }[] {
  const extensions: { name: string; description: string; code: string }[] = [];

  const extSections = sections.filter((s) => s.key.includes("extension"));
  if (extSections.length === 0) return extensions;

  for (const section of extSections) {
    // Check for "None" or empty
    if (section.body.toLowerCase().trim() === "none" || !section.body.trim()) continue;

    const blocks = section.body.split(/\n(?=\*\*[^*]+\*\*)/);

    for (const block of blocks) {
      const nameMatch = block.match(/\*\*(.+?)\*\*/);
      if (!nameMatch) continue;

      const name = nameMatch[1].trim();
      const descMatch = block.match(/\*\*.*?\*\*[:\s]*([^\n]*)/);
      const description = descMatch?.[1]?.trim() || name;

      const codeBlocks = [...block.matchAll(/```(?:typescript|ts|javascript|js)?\s*\n([\s\S]*?)\n```/g)];
      const code = codeBlocks.length > 0 ? codeBlocks[0][1].trim() : "";

      if (code) {
        extensions.push({ name, description, code });
      }
    }
  }

  return extensions;
}

// ---------------------------------------------------------------------------
// Grading parser
// ---------------------------------------------------------------------------

function parseGrading(sections: { key: string; inline: string; body: string }[]): { name: string; input: string; expected: string; criterionType: string }[] {
  const cases: { name: string; input: string; expected: string; criterionType: string }[] = [];

  const gradingSections = sections.filter(
    (s) => s.key.includes("grading") || s.key.includes("test") || s.key.includes("evaluation") || s.key.includes("évaluation")
  );
  if (gradingSections.length === 0) return cases;

  for (const section of gradingSections) {
    const v = section.body;

    // Pattern: **Test name**: Input: ... | Expected: ... | Criteria: ...
    const pipePattern = /\*\*(.+?)\*\*[:\s]*(?:Input|Entrée|Prompt)[:\s]*(.+?)\s*\|\s*(?:Expected|Attendu|Behavior)[:\s]*(.+?)\s*\|\s*(?:Criteria|Critère|Type)[:\s]*(.+?)(?:\n|$)/gi;
    let match;
    while ((match = pipePattern.exec(v)) !== null) {
      cases.push({
        name: match[1].trim(),
        input: match[2].trim(),
        expected: match[3].trim(),
        criterionType: normalizeCriterionType(match[4].trim()),
      });
    }

    // Fallback: bullet or numbered items with bold names
    if (cases.length === 0) {
      const bulletPattern = /(?:[-•]|\d+\.)\s+\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n(?:[-•]|\d+\.)\s+\*\*|\n#{2,}|$)/g;
      while ((match = bulletPattern.exec(v)) !== null) {
        const cName = match[1].trim();
        const cBody = match[2].trim();
        const inputMatch = cBody.match(/(?:Input|Entrée|Prompt)[:\s]*(.+?)(?:\n|$)/i);
        const expectedMatch = cBody.match(/(?:Expected|Attendu|Behavior)[:\s]*(.+?)(?:\n|$)/i);
        cases.push({
          name: cName,
          input: inputMatch?.[1]?.trim() || cBody.slice(0, 200),
          expected: expectedMatch?.[1]?.trim() || "Agent responds appropriately",
          criterionType: "llm_judge",
        });
      }
    }

    if (cases.length > 0) break;
  }

  return cases;
}

function normalizeCriterionType(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("output") || lower.includes("match")) return "output_match";
  if (lower.includes("schema")) return "schema_validation";
  if (lower.includes("tool")) return "tool_usage";
  if (lower.includes("safety") || lower.includes("sécurité")) return "safety_check";
  if (lower.includes("script") || lower.includes("custom")) return "custom_script";
  return "llm_judge";
}

// ---------------------------------------------------------------------------
// Purpose Gate parser
// ---------------------------------------------------------------------------

function parsePurposeGate(sections: { key: string; inline: string; body: string }[]): ParsedSpec["purposeGate"] {
  const section = findSection(sections, ["purpose gate", "purpose", "gate de focus"]);
  if (!section) return null;

  const body = section.body.toLowerCase();
  if (body.includes("none") && !body.includes("enabled")) return null;

  const enabledMatch = section.body.match(/(?:Enabled|Activé)[:\s]*(yes|oui|true|no|non|false)/i);
  const enabled = enabledMatch ? /yes|oui|true/i.test(enabledMatch[1]) : false;

  if (!enabled) return null;

  const questionMatch = section.body.match(/(?:Question)[:\s]*(.+?)(?:\n|$)/i);
  const question = questionMatch?.[1]?.trim().replace(/^["']|["']$/g, "") || "";

  if (!question || question.toLowerCase() === "n/a") return null;

  return { enabled: true, question, injectInSystemPrompt: true };
}

// ---------------------------------------------------------------------------
// TillDone parser
// ---------------------------------------------------------------------------

function parseTillDone(sections: { key: string; inline: string; body: string }[]): ParsedSpec["tillDone"] {
  const section = findSection(sections, ["tilldone", "till done", "till_done", "mode tilldone"]);
  if (!section) return null;

  const body = section.body.toLowerCase();
  if (body.includes("none") && !body.includes("enabled")) return null;

  const enabledMatch = section.body.match(/(?:Enabled|Activé)[:\s]*(yes|oui|true|no|non|false)/i);
  const enabled = enabledMatch ? /yes|oui|true/i.test(enabledMatch[1]) : false;

  if (!enabled) return null;

  const taskListMatch = section.body.match(/(?:Require Task List|Task List|Liste de tâches)[:\s]*(yes|oui|true|no|non|false)/i);
  const autoPromptMatch = section.body.match(/(?:Auto Prompt|Auto-Prompt|Relance auto)[:\s]*(yes|oui|true|no|non|false)/i);
  const confirmMatch = section.body.match(/(?:Confirm Before Clear|Confirm|Confirmation)[:\s]*(yes|oui|true|no|non|false)/i);

  return {
    enabled: true,
    requireTaskListBeforeExecution: taskListMatch ? /yes|oui|true/i.test(taskListMatch[1]) : true,
    autoPromptOnIncomplete: autoPromptMatch ? /yes|oui|true/i.test(autoPromptMatch[1]) : true,
    confirmBeforeClear: confirmMatch ? /yes|oui|true/i.test(confirmMatch[1]) : true,
  };
}

// ---------------------------------------------------------------------------
// Branding parser
// ---------------------------------------------------------------------------

function parseBranding(sections: { key: string; inline: string; body: string }[]): ParsedSpec["branding"] {
  const section = findSection(sections, ["branding", "identité visuelle", "visuel"]);
  if (!section) return null;

  const body = section.body;
  if (body.toLowerCase().trim() === "none") return null;

  const themeMatch = body.match(/(?:Theme Color|Couleur thème|Theme)[:\s]*(#[0-9a-fA-F]{6})/i);
  const accentMatch = body.match(/(?:Accent Color|Couleur accent|Accent)[:\s]*(#[0-9a-fA-F]{6})/i);
  const iconMatch = body.match(/(?:Icon|Icône)[:\s]*(\w+)/i);

  const VALID_ICONS = ["Bot", "Brain", "Code", "Shield", "Rocket", "Zap", "Target", "Eye", "Database", "Globe", "Lock", "MessageSquare", "Search", "Terminal", "Wand2"];

  const icon = iconMatch?.[1] || "Bot";
  const validIcon = VALID_ICONS.includes(icon) ? icon : "Bot";

  return {
    themeColor: themeMatch?.[1] || "#6366f1",
    accentColor: accentMatch?.[1] || "#f59e0b",
    icon: validIcon,
  };
}
