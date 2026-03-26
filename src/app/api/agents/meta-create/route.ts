import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";
import { META_AGENT_SYSTEM_PROMPT } from "@/data/meta-agent-template";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { resolveUserKey } from "@/lib/llm/resolve-key";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { AgentSpec } from "@/lib/meta-agent/types";
import { metaCreateSchema, validateBody } from "@/lib/security/validation";
import { checkRateLimit, chatRateLimit } from "@/lib/security/rate-limit";

// Allow long-running generation (default Vercel timeout is 60s)
export const maxDuration = 300;

const DEMO_RATE_LIMIT = 2; // max calls per IP per day

interface MetaCreateBody {
  description: string;
  modelProvider: string;
  modelId: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  const raw = await request.json();
  const parsed = validateBody(metaCreateSchema, raw);
  if ("error" in parsed) return parsed.error;

  const body = raw as MetaCreateBody;
  const { description, modelProvider, modelId, userId } = body;

  // Rate limit by userId or IP
  const rlKey = userId || (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const rl = await checkRateLimit(chatRateLimit, `meta:${rlKey}`);
  if (rl) return rl;

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

  // Rate limit anonymous demo usage by IP
  if (!userId) {
    const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const ref = adminDb.doc(`rateLimits/${ip.replace(/[./]/g, "_")}`);
    const snap = await ref.get();
    const data = snap.data();

    if (data && data.date === today && (data.count ?? 0) >= DEMO_RATE_LIMIT) {
      return NextResponse.json(
        { error: "DEMO_RATE_LIMITED" },
        { status: 429 }
      );
    }

    // Increment counter
    if (data?.date === today) {
      await ref.update({ count: FieldValue.increment(1) });
    } else {
      await ref.set({ date: today, count: 1 });
    }
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      send("status", { status: "analyzing" });

      // Resolve API key
      let apiKey: string | undefined;
      let resolvedProvider = modelProvider || "anthropic";
      let resolvedModel = modelId || "claude-sonnet-4-6";

      if (userId) {
        // Authenticated user: try requested provider first, then fallback to any available key
        const providerFallbacks: { provider: string; model: string }[] = [
          { provider: resolvedProvider, model: resolvedModel },
          { provider: "anthropic", model: "claude-sonnet-4-6" },
          { provider: "openai", model: "gpt-4o" },
          { provider: "google", model: "gemini-2.5-flash" },
          { provider: "mistral", model: "mistral-large-latest" },
        ];
        // Deduplicate (requested provider already in list)
        const seen = new Set<string>();
        for (const fb of providerFallbacks) {
          if (seen.has(fb.provider)) continue;
          seen.add(fb.provider);
          const key = await resolveUserKey(userId, fb.provider);
          if (key) {
            apiKey = key;
            resolvedProvider = fb.provider;
            resolvedModel = fb.model;
            break;
          }
        }
        if (!apiKey) {
          send("error", { message: "API_KEY_REQUIRED" });
          close();
          return;
        }
      } else {
        // Anonymous demo: use env var demo key only
        const envMap: Record<string, string> = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", google: "GOOGLE_AI_API_KEY" };
        const envKey = envMap[resolvedProvider] ? process.env[envMap[resolvedProvider]] : undefined;
        apiKey = envKey && envKey.length >= 8 ? envKey : undefined;
      }

      const messages: LLMMessage[] = [
        {
          role: "user",
          content: `Create a complete agent specification for the following request:\n\n${description}\n\nProvide the full specification in the structured format described in your instructions. Include ALL sections: name, domain, model, thinking level, built-in tools, system prompt, skills, tools, extensions, grading suite, purpose gate, tillDone, and branding. Be specific and production-ready.`,
        },
      ];

      let fullResponse = "";
      let tokenCount = 0;

      console.log(`[meta-create] Starting generation: provider=${resolvedProvider}, model=${resolvedModel}, maxTokens=32768, descLength=${description.length}`);

      await streamLLM(
        {
          provider: resolvedProvider,
          model: resolvedModel,
          systemPrompt: META_AGENT_SYSTEM_PROMPT,
          messages,
          apiKey,
          maxTokens: 32768,
        },
        {
          onToken: (text) => {
            fullResponse += text;
            tokenCount++;
            send("token", { text });
          },
          onDone: () => {
            console.log(`[meta-create] Stream complete: ${tokenCount} chunks, ${fullResponse.length} chars (~${Math.ceil(fullResponse.length / 4)} tokens)`);
            try {
              const spec = parseAgentSpec(fullResponse);
              console.log(`[meta-create] Parsed spec: name=${spec.name}, skills=${spec.skills.length}, tools=${spec.tools.length}, extensions=${spec.extensions.length}, grading=${spec.gradingCases.length}`);
              send("spec", spec);
              send("done", { success: true });
            } catch (parseErr) {
              console.error(`[meta-create] Parse error:`, parseErr);
              send("error", { message: `Spec parse failed: ${(parseErr as Error).message}` });
            }
            close();
          },
          onError: (error) => {
            console.error(`[meta-create] Stream error after ${tokenCount} chunks, ${fullResponse.length} chars:`, error.message);
            send("error", { message: error.message });
            close();
          },
        }
      );
    } catch (err) {
      console.error(`[meta-create] Uncaught error:`, (err as Error).message);
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
  if (lower.includes("github") || lower.includes("write") || lower.includes("pr") || lower.includes("branch")) tools.push("github_write");
  if (lower.includes("bug") || lower.includes("issue")) tools.push("bug_management");
  if (lower.includes("slack")) tools.push("slack_read");
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
    // 1. Check sub-headings (### Skill 1: Name)
    const subSkills = skillSections.filter((s) => s !== mainSection);
    if (subSkills.length > 0) {
      for (const sub of subSkills) {
        const name = cleanInline(sub.inline || sub.key.replace("skill", "").replace(/[^a-z0-9\s-]/g, "").trim()) || sub.key;
        const content = extractFromCodeBlock(sub.body) || sub.body;
        if (content) skills.push({ name, content });
      }
    }

    // 2. Numbered list: 1. **Name** content... (try first — most specific)
    if (skills.length === 0 && mainSection.body) {
      const itemPattern = /(?:^|\n)\s*\d+\.\s+\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*\d+\.\s+\*\*|\n#{2,}|$)/g;
      let match;
      while ((match = itemPattern.exec(mainSection.body)) !== null) {
        const sName = match[1].trim();
        const sContent = match[2].trim();
        if (sName && sContent) skills.push({ name: sName, content: sContent });
      }
    }

    // 3. Bold items: **Name** content... (with fixed lookahead for numbered/bullet prefixes)
    if (skills.length === 0 && mainSection.body) {
      const boldPattern = /\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*(?:\d+\.\s+)?\*\*[^*]|\n\s*[-•]\s+\*\*|\n#{2,}|$)/g;
      let match;
      while ((match = boldPattern.exec(mainSection.body)) !== null) {
        const sName = match[1].trim();
        const sContent = match[2].trim();
        if (sName && sContent) skills.push({ name: sName, content: sContent });
      }
    }

    // 4. Bullet list: - **Name** content...
    if (skills.length === 0 && mainSection.body) {
      const bulletPattern = /(?:^|\n)\s*[-•]\s+\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*[-•]\s+\*\*|\n#{2,}|$)/g;
      let match;
      while ((match = bulletPattern.exec(mainSection.body)) !== null) {
        const sName = match[1].trim();
        const sContent = match[2].trim();
        if (sName && sContent) skills.push({ name: sName, content: sContent });
      }
    }

    // 5. Final fallback: entire body as one skill
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

function parseExtensions(sections: { key: string; inline: string; body: string }[]): { name: string; description: string; code: string; events: string[] }[] {
  const extensions: { name: string; description: string; code: string; events: string[] }[] = [];

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
        const events = detectExtensionEvents(code, name, description);
        extensions.push({ name, description, code, events });
      }
    }
  }

  return extensions;
}

/** Auto-detect which events an extension should listen to based on its code and metadata */
function detectExtensionEvents(code: string, name: string, description: string): string[] {
  const combined = `${code} ${name} ${description}`.toLowerCase();
  const events: string[] = [];

  // Check for explicit event type references in code
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

  // Heuristic fallbacks if no explicit event found
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
      // Default: trigger on message sent
      events.push("message_sent");
    }
  }

  return events;
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

    // 1. Pipe format: **Name**: Input: ... | Expected: ... | Criteria: ...
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

    // 2. Numbered/bullet items with bold names (fixed: \s* between items handles blank lines)
    if (cases.length === 0) {
      const bulletPattern = /(?:^|\n)\s*(?:[-•]|\d+\.)\s+\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*(?:[-•]|\d+\.)\s+\*\*|\n#{2,}|$)/g;
      while ((match = bulletPattern.exec(v)) !== null) {
        const cName = match[1].trim();
        const cBody = match[2].trim();
        const inputMatch = cBody.match(/(?:Input|Entrée|Prompt)[:\s]*([\s\S]*?)(?=\s*[-•]\s*(?:Expected|Attendu|Behavior|Criteria|Critère)|$)/i);
        const expectedMatch = cBody.match(/(?:Expected|Attendu|Behavior)[:\s]*([\s\S]*?)(?=\s*[-•]\s*(?:Criteria|Critère|Type)|$)/i);
        const criteriaMatch = cBody.match(/(?:Criteria|Critère|Type)[:\s]*(.+?)(?:\n|$)/i);
        cases.push({
          name: cName,
          input: inputMatch?.[1]?.trim() || cBody.split("\n")[0]?.trim() || cBody.slice(0, 200),
          expected: expectedMatch?.[1]?.trim() || "Agent responds appropriately",
          criterionType: criteriaMatch ? normalizeCriterionType(criteriaMatch[1].trim()) : "llm_judge",
        });
      }
    }

    // 3. Bold-only items without numbered/bullet prefix
    if (cases.length === 0) {
      const boldPattern = /\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\s*(?:\d+\.\s+)?\*\*[^*]|\n#{2,}|$)/g;
      while ((match = boldPattern.exec(v)) !== null) {
        const cName = match[1].trim();
        const cBody = match[2].trim();
        if (!cBody || cBody.length < 5) continue;
        const inputMatch = cBody.match(/(?:Input|Entrée|Prompt)[:\s]*([\s\S]*?)(?=\s*(?:Expected|Attendu|Behavior|Criteria|Critère)|\n\n|$)/i);
        const expectedMatch = cBody.match(/(?:Expected|Attendu|Behavior)[:\s]*([\s\S]*?)(?=\s*(?:Criteria|Critère|Type)|\n\n|$)/i);
        cases.push({
          name: cName,
          input: inputMatch?.[1]?.trim() || cBody.split("\n")[0]?.trim() || cBody.slice(0, 200),
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
