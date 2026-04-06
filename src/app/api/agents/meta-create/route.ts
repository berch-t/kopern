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
import { parseAgentSpecMarkdown, detectExtensionEvents } from "@/lib/meta-agent/parse-markdown-legacy";
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
        const envMap: Record<string, string> = { anthropic: "ANTHROPIC_API_KEY", openai: "OPENAI_API_KEY", google: "GOOGLE_AI_API_KEY", mistral: "MISTRAL_API_KEY" };
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
// JSON-first parser with markdown fallback
// ---------------------------------------------------------------------------

type ParsedSpec = AgentSpec;

function parseAgentSpec(response: string): ParsedSpec {
  // 1. Try JSON extraction (primary path — new normalized output)
  const jsonSpec = tryParseJSON(response);
  if (jsonSpec) {
    console.log(`[meta-create] JSON parse succeeded`);
    return jsonSpec;
  }

  // 2. Fallback: legacy markdown section-based parser
  console.log(`[meta-create] JSON parse failed, falling back to markdown parser`);
  return parseAgentSpecMarkdown(response);
}

/**
 * Extract and parse JSON from a ```json code block or raw JSON in the response.
 * Returns null if no valid JSON found.
 */
function tryParseJSON(response: string): ParsedSpec | null {
  // Try ```json code block first
  const codeBlockMatch = response.match(/```json\s*\n([\s\S]*?)\n```/);
  const jsonStr = codeBlockMatch?.[1]?.trim();

  // Also try raw JSON (entire response might be JSON)
  const candidates = jsonStr ? [jsonStr, response.trim()] : [response.trim()];

  for (const candidate of candidates) {
    // Quick check: must start with {
    if (!candidate.startsWith("{")) continue;

    try {
      const raw = JSON.parse(candidate);
      if (!raw || typeof raw !== "object" || !raw.name) continue;

      // Validate and normalize fields
      const VALID_PROVIDERS = ["anthropic", "openai", "google", "mistral"];
      const VALID_THINKING = ["off", "low", "medium", "high", "minimal"];
      const VALID_ICONS = ["Bot", "Brain", "Code", "Shield", "Rocket", "Zap", "Target", "Eye", "Database", "Globe", "Lock", "MessageSquare", "Search", "Terminal", "Wand2"];
      const VALID_CRITERIA = ["output_match", "schema_validation", "tool_usage", "safety_check", "custom_script", "llm_judge"];

      const modelProvider = VALID_PROVIDERS.includes(raw.modelProvider) ? raw.modelProvider : "anthropic";
      const thinkingLevel = VALID_THINKING.includes(raw.thinkingLevel) ? raw.thinkingLevel : "off";

      // Parse skills — ensure content is string
      const skills: ParsedSpec["skills"] = [];
      if (Array.isArray(raw.skills)) {
        for (const s of raw.skills) {
          if (s && typeof s.name === "string" && typeof s.content === "string" && s.content.length > 0) {
            skills.push({ name: s.name, content: s.content });
          }
        }
      }

      // Parse tools — parametersSchema can be object or string
      const tools: ParsedSpec["tools"] = [];
      if (Array.isArray(raw.tools)) {
        for (const t of raw.tools) {
          if (!t || typeof t.name !== "string") continue;
          const name = t.name.replace(/\s+/g, "_").toLowerCase();
          const description = typeof t.description === "string" ? t.description : name;
          let parametersSchema: string;
          if (typeof t.parametersSchema === "object" && t.parametersSchema !== null) {
            parametersSchema = JSON.stringify(t.parametersSchema);
          } else if (typeof t.parametersSchema === "string") {
            parametersSchema = t.parametersSchema;
          } else {
            parametersSchema = '{"type":"object","properties":{}}';
          }
          const executeCode = typeof t.executeCode === "string" && t.executeCode.length > 0
            ? t.executeCode
            : `result = JSON.stringify({ error: 'Tool code was not generated. Please edit this tool and add working JavaScript code.', tool: '${name.replace(/'/g, "")}' });`;
          tools.push({ name, description, parametersSchema, executeCode });
        }
      }

      // Parse extensions — detect events from code
      const extensions: ParsedSpec["extensions"] = [];
      if (Array.isArray(raw.extensions)) {
        for (const e of raw.extensions) {
          if (!e || typeof e.name !== "string") continue;
          const code = typeof e.code === "string" ? e.code : "";
          if (!code) continue;
          const description = typeof e.description === "string" ? e.description : e.name;
          const events = detectExtensionEvents(code, e.name, description);
          extensions.push({ name: e.name, description, code, events });
        }
      }

      // Parse grading cases
      const gradingCases: ParsedSpec["gradingCases"] = [];
      if (Array.isArray(raw.gradingCases)) {
        for (const g of raw.gradingCases) {
          if (!g || typeof g.name !== "string") continue;
          gradingCases.push({
            name: g.name,
            input: typeof g.input === "string" ? g.input : "",
            expected: typeof g.expected === "string" ? g.expected : "Agent responds appropriately",
            criterionType: VALID_CRITERIA.includes(g.criterionType) ? g.criterionType : "llm_judge",
          });
        }
      }

      // Purpose gate
      let purposeGate: ParsedSpec["purposeGate"] = null;
      if (raw.purposeGate && typeof raw.purposeGate === "object" && raw.purposeGate.enabled) {
        const q = typeof raw.purposeGate.question === "string" ? raw.purposeGate.question : "";
        if (q && q.toLowerCase() !== "n/a") {
          purposeGate = { enabled: true, question: q, injectInSystemPrompt: true };
        }
      }

      // TillDone
      let tillDone: ParsedSpec["tillDone"] = null;
      if (raw.tillDone && typeof raw.tillDone === "object" && raw.tillDone.enabled) {
        tillDone = {
          enabled: true,
          requireTaskListBeforeExecution: raw.tillDone.requireTaskListBeforeExecution !== false,
          autoPromptOnIncomplete: raw.tillDone.autoPromptOnIncomplete !== false,
          confirmBeforeClear: raw.tillDone.confirmBeforeClear !== false,
        };
      }

      // Branding
      let branding: ParsedSpec["branding"] = null;
      if (raw.branding && typeof raw.branding === "object") {
        const hexRe = /^#[0-9a-fA-F]{6}$/;
        const icon = VALID_ICONS.includes(raw.branding.icon) ? raw.branding.icon : "Bot";
        branding = {
          themeColor: hexRe.test(raw.branding.themeColor) ? raw.branding.themeColor : "#6366f1",
          accentColor: hexRe.test(raw.branding.accentColor) ? raw.branding.accentColor : "#f59e0b",
          icon,
        };
      }

      // Builtin tools — filter valid values
      const VALID_BUILTINS = ["memory", "service_email", "service_calendar", "github_write", "bug_management", "slack_read", "campaign_email", "campaign_tracker"];
      const builtinTools = Array.isArray(raw.builtinTools)
        ? raw.builtinTools.filter((t: unknown) => typeof t === "string" && VALID_BUILTINS.includes(t as string))
        : [];

      return {
        name: String(raw.name || "New Agent"),
        domain: String(raw.domain || "other"),
        systemPrompt: String(raw.systemPrompt || ""),
        modelProvider,
        modelId: String(raw.modelId || "claude-sonnet-4-6"),
        thinkingLevel,
        builtinTools,
        skills,
        tools,
        extensions,
        gradingCases,
        purposeGate,
        tillDone,
        branding,
        rawSpec: response,
      };
    } catch {
      // JSON.parse failed, try next candidate
      continue;
    }
  }

  return null;
}

