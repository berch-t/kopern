/**
 * Legacy markdown-based parser for meta-create LLM output.
 * Used as fallback when the LLM does not produce valid JSON.
 * This file should be removed once all LLM outputs reliably use JSON format.
 */

import type { AgentSpec } from "./types";

type ParsedSpec = AgentSpec;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseAgentSpecMarkdown(response: string): ParsedSpec {
  const sections = splitSections(response);

  const nameSection = findSection(sections, ["agent name", "name", "nom de l'agent", "nom"]);
  const name = cleanInline(nameSection?.inline || nameSection?.body.split("\n")[0] || "") || "New Agent";

  const domainSection = findSection(sections, ["domain", "domaine"]);
  const domain = cleanInline(domainSection?.inline || domainSection?.body.split("\n")[0] || "") || "other";

  const providerSection = findSection(sections, ["model provider", "fournisseur"]);
  const modelProvider = normalizeProvider(
    cleanInline(providerSection?.inline || providerSection?.body.split("\n")[0] || "")
  );

  const modelIdSection = findSection(sections, ["model id", "modèle", "model identifier"]);
  const modelId = cleanInline(modelIdSection?.inline || modelIdSection?.body.split("\n")[0] || "")
    || "claude-sonnet-4-6";

  const thinkingSection = findSection(sections, ["thinking level", "thinking", "niveau de réflexion"]);
  const thinkingLevel = normalizeThinking(
    cleanInline(thinkingSection?.inline || thinkingSection?.body.split("\n")[0] || "")
  );

  const builtinSection = findSection(sections, ["built-in tools", "builtin tools", "outils intégrés"]);
  const builtinTools = parseBuiltinTools(
    cleanInline(builtinSection?.inline || builtinSection?.body.split("\n")[0] || "")
  );

  const promptSection = findSection(sections, ["system prompt", "prompt système", "prompt systeme", "prompt syst"]);
  let systemPrompt = "";
  if (promptSection) {
    systemPrompt = extractFromCodeBlock(promptSection.body) || promptSection.body;
  }
  if (!systemPrompt) {
    systemPrompt = response.slice(0, 500);
  }

  const skills = parseSkills(sections);
  const tools = parseTools(sections);
  const extensions = parseExtensions(sections);
  const gradingCases = parseGrading(sections);
  const purposeGate = parsePurposeGate(sections);
  const tillDone = parseTillDone(sections);
  const branding = parseBranding(sections);

  return {
    name, domain, systemPrompt, modelProvider, modelId, thinkingLevel, builtinTools,
    skills, tools, extensions, gradingCases,
    purposeGate, tillDone, branding,
    rawSpec: response,
  };
}

/** Auto-detect which events an extension should listen to based on its code and metadata */
export function detectExtensionEvents(code: string, name: string, description: string): string[] {
  const combined = `${code} ${name} ${description}`.toLowerCase();
  const events: string[] = [];

  const eventTypeMap: Record<string, string[]> = {
    "message:before": ["message:before", "message_before"],
    "message:after": ["message:after", "message_after"],
    "message_sent": ["message_sent"],
    "tool_call:before": ["tool_call:before", "tool_call_before"],
    "tool_call:after": ["tool_call:after", "tool_call_after"],
    "tool_call_start": ["tool_call_start"],
    "tool_call_end": ["tool_call_end"],
    "tool_call_error": ["tool_call_error"],
    "session:start": ["session:start", "session_start"],
    "session:end": ["session:end", "session_end"],
    "error": ["error"],
  };

  for (const [event, patterns] of Object.entries(eventTypeMap)) {
    if (patterns.some((p) => combined.includes(p))) {
      events.push(event);
    }
  }

  if (events.length === 0) {
    const lower = combined;
    if (lower.includes("safety") || lower.includes("pii") || lower.includes("block") || lower.includes("filter") || lower.includes("sécurité")) {
      events.push("message:before", "message:after");
    } else if (lower.includes("log") || lower.includes("audit") || lower.includes("track")) {
      events.push("message_sent", "tool_call_end");
    } else if (lower.includes("cost") || lower.includes("token") || lower.includes("limit") || lower.includes("coût")) {
      events.push("message:before");
    } else if (lower.includes("tool")) {
      events.push("tool_call:before", "tool_call:after");
    } else {
      events.push("message_sent");
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Section splitter
// ---------------------------------------------------------------------------

interface Section { key: string; inline: string; body: string }

function splitSections(text: string): Section[] {
  const result: Section[] = [];
  const headingPattern = /^(#{2,4})\s+(.+)$/gm;
  const headings: { text: string; start: number; matchEnd: number }[] = [];
  let m;
  while ((m = headingPattern.exec(text)) !== null) {
    headings.push({ text: m[2], start: m.index, matchEnd: m.index + m[0].length });
  }
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const bodyEnd = i + 1 < headings.length ? headings[i + 1].start : text.length;
    const body = text.slice(h.matchEnd, bodyEnd).trim();
    const colonIdx = h.text.indexOf(":");
    const key = (colonIdx >= 0 ? h.text.slice(0, colonIdx) : h.text).trim().toLowerCase();
    const inline = colonIdx >= 0 ? h.text.slice(colonIdx + 1).trim() : "";
    result.push({ key, inline, body });
  }
  return result;
}

function findSection(sections: Section[], keywords: string[]) {
  for (const kw of keywords) {
    for (const s of sections) {
      if (s.key.includes(kw)) return s;
    }
  }
  return null;
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
  if (lower.includes("github") || lower.includes("write") || lower.includes("pr") || lower.includes("branch")) tools.push("github_write");
  if (lower.includes("bug") || lower.includes("issue")) tools.push("bug_management");
  if (lower.includes("slack")) tools.push("slack_read");
  return tools;
}

// ---------------------------------------------------------------------------
// Skills parser
// ---------------------------------------------------------------------------

function parseSkills(sections: Section[]): { name: string; content: string }[] {
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
      const itemPattern = /(?:^|\n)\s*\d+\.\s+\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*\d+\.\s+\*\*|\n#{2,}|$)/g;
      let match;
      while ((match = itemPattern.exec(mainSection.body)) !== null) {
        const sName = match[1].trim();
        const sContent = match[2].trim();
        if (sName && sContent) skills.push({ name: sName, content: sContent });
      }
    }

    if (skills.length === 0 && mainSection.body) {
      const boldPattern = /\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*(?:\d+\.\s+)?\*\*[^*]|\n\s*[-•]\s+\*\*|\n#{2,}|$)/g;
      let match;
      while ((match = boldPattern.exec(mainSection.body)) !== null) {
        const sName = match[1].trim();
        const sContent = match[2].trim();
        if (sName && sContent) skills.push({ name: sName, content: sContent });
      }
    }

    if (skills.length === 0 && mainSection.body) {
      const bulletPattern = /(?:^|\n)\s*[-•]\s+\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*[-•]\s+\*\*|\n#{2,}|$)/g;
      let match;
      while ((match = bulletPattern.exec(mainSection.body)) !== null) {
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

function parseTools(sections: Section[]): { name: string; description: string; parametersSchema: string; executeCode: string }[] {
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
          try {
            const parsed = JSON.parse(code);
            if (parsed.parametersSchema && typeof parsed.parametersSchema === "object") {
              parametersSchema = JSON.stringify(parsed.parametersSchema);
            } else if (parsed.input_schema && typeof parsed.input_schema === "object") {
              parametersSchema = JSON.stringify(parsed.input_schema);
            } else if (parsed.parameters && typeof parsed.parameters === "object" && typeof parsed.name === "string") {
              parametersSchema = JSON.stringify(parsed.parameters);
            } else {
              parametersSchema = code;
            }
          } catch {
            parametersSchema = code;
          }
        } else {
          executeCode = code;
        }
      }

      tools.push({ name: name.replace(/\s+/g, "_").toLowerCase(), description, parametersSchema, executeCode });
    }
  }

  return tools;
}

function isJSON(s: string): boolean {
  try { JSON.parse(s); return true; } catch { return false; }
}

// ---------------------------------------------------------------------------
// Extensions parser
// ---------------------------------------------------------------------------

function parseExtensions(sections: Section[]): { name: string; description: string; code: string; events: string[] }[] {
  const extensions: { name: string; description: string; code: string; events: string[] }[] = [];
  const extSections = sections.filter((s) => s.key.includes("extension"));
  if (extSections.length === 0) return extensions;

  for (const section of extSections) {
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
        const events = detectExtensionEvents(code, name, description);
        extensions.push({ name, description, code, events });
      }
    }
  }

  return extensions;
}

// ---------------------------------------------------------------------------
// Grading parser
// ---------------------------------------------------------------------------

function parseGrading(sections: Section[]): { name: string; input: string; expected: string; criterionType: string }[] {
  const cases: { name: string; input: string; expected: string; criterionType: string }[] = [];
  const gradingSections = sections.filter(
    (s) => s.key.includes("grading") || s.key.includes("test") || s.key.includes("evaluation") || s.key.includes("évaluation") || s.key.includes("qualit")
  );
  if (gradingSections.length === 0) return cases;

  const INPUT_RE = /(?:input|entrée|prompt|message\s*(?:utilisateur|user)|question|requête|scenario)[:\s]*[""]?([\s\S]*?)[""]?(?=\s*[-•]\s*(?:expected|attendu|behavior|comportement|réponse|criteria|critère|type|évaluation)|$)/i;
  const EXPECTED_RE = /(?:expected|attendu|behavior|comportement\s*attendu|réponse\s*attendue|résultat\s*attendu)[:\s]*[""]?([\s\S]*?)[""]?(?=\s*[-•]\s*(?:criteria|critère|type|évaluation)|\n\n|$)/i;
  const CRITERIA_RE = /(?:criteria|critère|type|évaluation)[:\s]*(.+?)(?:\n|$)/i;

  for (const section of gradingSections) {
    const v = section.body;

    // 1. Pipe format
    const pipePattern = /\*\*(.+?)\*\*[:\s]*(?:Input|Entrée|Prompt)[:\s]*(.+?)\s*\|\s*(?:Expected|Attendu|Behavior|Comportement)[:\s]*(.+?)\s*\|\s*(?:Criteria|Critère|Type)[:\s]*(.+?)(?:\n|$)/gi;
    let match;
    while ((match = pipePattern.exec(v)) !== null) {
      cases.push({
        name: match[1].trim(),
        input: match[2].trim(),
        expected: match[3].trim(),
        criterionType: normalizeCriterionType(match[4].trim()),
      });
    }

    // 2. Numbered/bullet items with bold names
    if (cases.length === 0) {
      const bulletPattern = /(?:^|\n)\s*(?:[-•*]|\d+[.)]\s*)\s*\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*(?:[-•*]|\d+[.)])\s*\*\*|\n#{2,}|$)/g;
      while ((match = bulletPattern.exec(v)) !== null) {
        const cName = match[1].trim();
        const cBody = match[2].trim();
        if (!cBody || cBody.length < 3) continue;
        const inputMatch = cBody.match(INPUT_RE);
        const expectedMatch = cBody.match(EXPECTED_RE);
        const criteriaMatch = cBody.match(CRITERIA_RE);
        cases.push({
          name: cName,
          input: cleanQuotes(inputMatch?.[1]?.trim()) || extractFirstLine(cBody),
          expected: cleanQuotes(expectedMatch?.[1]?.trim()) || "Agent responds appropriately",
          criterionType: criteriaMatch ? normalizeCriterionType(criteriaMatch[1].trim()) : "llm_judge",
        });
      }
    }

    // 3. Bold-only items
    if (cases.length === 0) {
      const boldPattern = /\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*(?:\d+[.)]\s*)?\*\*[^*]|\n#{2,}|$)/g;
      while ((match = boldPattern.exec(v)) !== null) {
        const cName = match[1].trim();
        const cBody = match[2].trim();
        if (!cBody || cBody.length < 5) continue;
        const inputMatch = cBody.match(INPUT_RE);
        const expectedMatch = cBody.match(EXPECTED_RE);
        cases.push({
          name: cName,
          input: cleanQuotes(inputMatch?.[1]?.trim()) || extractFirstLine(cBody),
          expected: cleanQuotes(expectedMatch?.[1]?.trim()) || "Agent responds appropriately",
          criterionType: "llm_judge",
        });
      }
    }

    // 4. Numbered items WITHOUT bold
    if (cases.length === 0) {
      const numberedPattern = /(?:^|\n)\s*(\d+)[.)]\s+(.+?)(?:\n([\s\S]*?))?(?=\n\s*\d+[.)]\s|\n#{2,}|$)/g;
      while ((match = numberedPattern.exec(v)) !== null) {
        const firstLine = match[2].trim();
        const rest = (match[3] || "").trim();
        const nameSep = firstLine.match(/^(.+?)(?:\s*[—–-]\s*|\s*:\s*)(.*)/);
        const cName = nameSep ? nameSep[1].replace(/\*\*/g, "").trim() : firstLine.replace(/\*\*/g, "").trim();
        const afterName = nameSep ? nameSep[2] : "";
        const cBody = afterName + "\n" + rest;
        const inputMatch = cBody.match(INPUT_RE);
        const expectedMatch = cBody.match(EXPECTED_RE);
        let input = cleanQuotes(inputMatch?.[1]?.trim());
        if (!input) {
          const quotedMatch = cBody.match(/[""](.+?)[""]/);
          input = quotedMatch?.[1]?.trim() || extractFirstLine(cBody);
        }
        cases.push({
          name: cName,
          input,
          expected: cleanQuotes(expectedMatch?.[1]?.trim()) || "Agent responds appropriately",
          criterionType: "llm_judge",
        });
      }
    }

    // 5. Last resort: split by double newlines
    if (cases.length === 0) {
      const blocks = v.split(/\n\n+/).filter(b => b.trim().length > 10);
      for (let i = 0; i < blocks.length && i < 15; i++) {
        const block = blocks[i].trim();
        const firstLine = block.split("\n")[0].replace(/^[\s\d.*#-]+/, "").replace(/\*\*/g, "").trim();
        if (!firstLine || firstLine.length < 3) continue;
        const inputMatch = block.match(INPUT_RE);
        const expectedMatch = block.match(EXPECTED_RE);
        const quotedMatch = block.match(/[""](.+?)[""]/);
        cases.push({
          name: firstLine.slice(0, 80),
          input: cleanQuotes(inputMatch?.[1]?.trim()) || quotedMatch?.[1]?.trim() || firstLine,
          expected: cleanQuotes(expectedMatch?.[1]?.trim()) || "Agent responds appropriately",
          criterionType: "llm_judge",
        });
      }
    }

    if (cases.length > 0) break;
  }

  console.log(`[parseGrading] Parsed ${cases.length} cases from ${gradingSections.length} section(s)`);
  return cases;
}

function cleanQuotes(s: string | undefined): string {
  if (!s) return "";
  return s.replace(/^[""\s]+|[""\s]+$/g, "").trim();
}

function extractFirstLine(body: string): string {
  const lines = body.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  for (const line of lines) {
    if (!/^(?:input|entrée|prompt|expected|attendu|criteria|critère|type|évaluation)[:\s]/i.test(line)) {
      const cleaned = line.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "").trim();
      if (cleaned.length > 3) return cleaned;
    }
  }
  return lines[0]?.replace(/^[-•*]\s*/, "").trim() || body.slice(0, 200);
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

function parsePurposeGate(sections: Section[]): ParsedSpec["purposeGate"] {
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

function parseTillDone(sections: Section[]): ParsedSpec["tillDone"] {
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

function parseBranding(sections: Section[]): ParsedSpec["branding"] {
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
