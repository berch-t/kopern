import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";
import { META_AGENT_SYSTEM_PROMPT } from "@/data/meta-agent-template";

interface MetaCreateBody {
  description: string;
  modelProvider: string;
  modelId: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as MetaCreateBody;
  const { description, modelProvider, modelId } = body;

  if (!description || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Description must be at least 10 characters" },
      { status: 400 }
    );
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      send("status", { status: "analyzing" });

      const messages: LLMMessage[] = [
        {
          role: "user",
          content: `Create a complete agent specification for the following request:\n\n${description}\n\nProvide the full specification in the structured format described in your instructions. Be specific and production-ready.`,
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
// Robust section-based parser
// ---------------------------------------------------------------------------

interface ParsedSpec {
  name: string;
  domain: string;
  systemPrompt: string;
  skills: { name: string; content: string }[];
  tools: { name: string; description: string; parametersSchema: string; executeCode: string }[];
  gradingCases: { name: string; input: string; expected: string; criterionType: string }[];
  settings: { model?: string; thinking?: string; purposeGate?: string; tillDone?: string };
  rawSpec: string;
}

function parseAgentSpec(response: string): ParsedSpec {
  // Split the response into named sections based on ### headings
  const sections = extractSections(response);

  // --- Name ---
  const name = extractInlineValue(sections, ["agent name", "name", "nom de l'agent", "nom"]) || "New Agent";

  // --- Domain ---
  const domain = extractInlineValue(sections, ["domain", "domaine"]) || "General";

  // --- System Prompt ---
  const systemPrompt = extractSectionBody(sections, ["system prompt", "prompt système", "prompt systeme"]) || response.slice(0, 500);

  // --- Skills ---
  const skills = parseSkills(sections);

  // --- Tools ---
  const tools = parseTools(sections);

  // --- Grading ---
  const gradingCases = parseGrading(sections);

  // --- Settings ---
  const settings = parseSettings(sections);

  return { name, domain, systemPrompt, skills, tools, gradingCases, settings, rawSpec: response };
}

/**
 * Split markdown into sections keyed by lowercase heading text.
 * Returns a Map<normalizedHeading, bodyText>.
 */
function extractSections(text: string): Map<string, string> {
  const map = new Map<string, string>();
  // Match ### headings (with optional inline value after colon)
  const headingRegex = /^#{2,4}\s+(.+)$/gm;
  const matches: { heading: string; start: number; end: number }[] = [];
  let m;

  while ((m = headingRegex.exec(text)) !== null) {
    matches.push({ heading: m[1], start: m.index + m[0].length, end: 0 });
  }

  for (let i = 0; i < matches.length; i++) {
    const next = matches[i + 1];
    matches[i].end = next ? next.start - (text.slice(next.start).search(/\S/) >= 0 ? text.slice(0, next.start).lastIndexOf("\n#") - matches[i].start : 0) : text.length;
    // Simpler: body is everything between this heading end and the next heading start
    const bodyEnd = next
      ? text.lastIndexOf("\n", text.indexOf("\n#", matches[i].start))
      : text.length;
    const body = text.slice(matches[i].start, next ? next.start - (matches[i].heading.length + 4) : text.length);

    // Normalize heading: remove colon + inline value for key, keep body
    const raw = matches[i].heading;
    const colonIdx = raw.indexOf(":");
    const key = (colonIdx >= 0 ? raw.slice(0, colonIdx) : raw).trim().toLowerCase();

    // If there's an inline value after the colon, prepend it to body
    const inlineVal = colonIdx >= 0 ? raw.slice(colonIdx + 1).trim() : "";
    const actualBody = inlineVal ? inlineVal + "\n" + text.slice(matches[i].start, next ? getNextHeadingPos(text, matches[i].start) : text.length).trim() : text.slice(matches[i].start, next ? getNextHeadingPos(text, matches[i].start) : text.length).trim();

    map.set(key, actualBody);
  }

  return map;
}

function getNextHeadingPos(text: string, fromPos: number): number {
  const match = text.slice(fromPos).match(/\n#{2,4}\s+/);
  return match ? fromPos + match.index! : text.length;
}

function extractInlineValue(sections: Map<string, string>, keys: string[]): string {
  for (const key of keys) {
    for (const [k, v] of sections) {
      if (k.includes(key)) {
        // First line is likely the value
        const firstLine = v.split("\n")[0].trim();
        // Remove markdown formatting
        return firstLine.replace(/^\*+|\*+$/g, "").replace(/^`+|`+$/g, "").trim();
      }
    }
  }
  return "";
}

function extractSectionBody(sections: Map<string, string>, keys: string[]): string {
  for (const key of keys) {
    for (const [k, v] of sections) {
      if (k.includes(key)) {
        // For system prompt, skip the first line if it looks like just a label
        const lines = v.split("\n");
        // If first line is very short (just the inline value we already extracted as name),
        // the body is the rest
        const body = lines.join("\n").trim();
        return body;
      }
    }
  }
  return "";
}

function parseSkills(sections: Map<string, string>): { name: string; content: string }[] {
  const skills: { name: string; content: string }[] = [];

  for (const [k, v] of sections) {
    if (!k.includes("skill")) continue;

    // Try to parse bullet-based skills: - **Name**: content  OR  ### Skill Name\ncontent
    // Pattern 1: **bold name** followed by content
    const boldPattern = /\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n\*\*|\n#{2,}|$)/g;
    let match;
    while ((match = boldPattern.exec(v)) !== null) {
      const name = match[1].trim();
      const content = match[2].trim();
      if (name && content) skills.push({ name, content });
    }

    // Pattern 2: numbered or bulleted items without bold
    if (skills.length === 0) {
      const itemPattern = /[-•]\s+(.+?):\s*([\s\S]*?)(?=\n[-•]|\n#{2,}|$)/g;
      while ((match = itemPattern.exec(v)) !== null) {
        const name = match[1].trim();
        const content = match[2].trim();
        if (name && content) skills.push({ name, content });
      }
    }

    break;
  }

  return skills;
}

function parseTools(sections: Map<string, string>): { name: string; description: string; parametersSchema: string; executeCode: string }[] {
  const tools: { name: string; description: string; parametersSchema: string; executeCode: string }[] = [];

  for (const [k, v] of sections) {
    if (!k.includes("tool") || k.includes("override")) continue;

    // Split by bold tool names
    const toolBlocks = v.split(/\n(?=\*\*)/);

    for (const block of toolBlocks) {
      const nameMatch = block.match(/\*\*(.+?)\*\*/);
      if (!nameMatch) continue;

      const name = nameMatch[1].trim();

      // Extract description (text after the bold name)
      const descMatch = block.match(/\*\*.*?\*\*[:\s]*([^\n]*)/);
      const description = descMatch?.[1]?.trim() || name;

      // Extract JSON schema from code blocks
      const schemaMatch = block.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      let parametersSchema = '{"type":"object","properties":{}}';
      if (schemaMatch) {
        try {
          JSON.parse(schemaMatch[1].trim());
          parametersSchema = schemaMatch[1].trim();
        } catch {
          // Not valid JSON, keep default
        }
      }

      // Extract JS code from code blocks (second code block, or one marked as js/javascript)
      const codeBlocks = [...block.matchAll(/```(?:js|javascript)?\s*\n?([\s\S]*?)\n?```/g)];
      let executeCode = "return { result: 'Not implemented' };";
      // Use the last code block that looks like JS (not JSON)
      for (const cb of codeBlocks) {
        const code = cb[1].trim();
        try {
          JSON.parse(code);
          // It's JSON, skip
        } catch {
          // Not JSON, likely JS code
          executeCode = code;
        }
      }

      tools.push({ name: name.replace(/\s+/g, "_").toLowerCase(), description, parametersSchema, executeCode });
    }

    break;
  }

  return tools;
}

function parseGrading(sections: Map<string, string>): { name: string; input: string; expected: string; criterionType: string }[] {
  const cases: { name: string; input: string; expected: string; criterionType: string }[] = [];

  for (const [k, v] of sections) {
    if (!k.includes("grading") && !k.includes("test") && !k.includes("evaluation")) continue;

    // Pattern: **Test name**: Input: ... | Expected: ... | Criteria: ...
    const pipePattern = /\*\*(.+?)\*\*[:\s]*(?:Input|Entrée)[:\s]*(.+?)\s*\|\s*(?:Expected|Attendu)[:\s]*(.+?)\s*\|\s*(?:Criteria|Critère|Type)[:\s]*(.+?)(?:\n|$)/g;
    let match;
    while ((match = pipePattern.exec(v)) !== null) {
      cases.push({
        name: match[1].trim(),
        input: match[2].trim(),
        expected: match[3].trim(),
        criterionType: normalizeCriterionType(match[4].trim()),
      });
    }

    // Fallback: bullet items without pipe format
    if (cases.length === 0) {
      const bulletPattern = /[-•]\s+\*\*(.+?)\*\*[:\s]*([\s\S]*?)(?=\n[-•]\s+\*\*|\n#{2,}|$)/g;
      while ((match = bulletPattern.exec(v)) !== null) {
        const name = match[1].trim();
        const body = match[2].trim();
        cases.push({
          name,
          input: body.slice(0, 200),
          expected: "Agent responds appropriately",
          criterionType: "llm_judge",
        });
      }
    }

    break;
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

function parseSettings(sections: Map<string, string>): { model?: string; thinking?: string; purposeGate?: string; tillDone?: string } {
  const settings: Record<string, string> = {};

  for (const [k, v] of sections) {
    if (!k.includes("setting") && !k.includes("config") && !k.includes("recommand") && !k.includes("recommend")) continue;

    const lines = v.split("\n");
    for (const line of lines) {
      const kvMatch = line.match(/[-•]\s*(?:\*\*)?(.+?)(?:\*\*)?[:\s]+(.+)/);
      if (kvMatch) {
        const key = kvMatch[1].trim().toLowerCase();
        const val = kvMatch[2].trim();
        if (key.includes("model") || key.includes("modèle")) settings.model = val;
        if (key.includes("think") || key.includes("réflexion")) settings.thinking = val;
        if (key.includes("purpose") || key.includes("gate")) settings.purposeGate = val;
        if (key.includes("tilldone") || key.includes("till")) settings.tillDone = val;
      }
    }

    break;
  }

  return settings;
}
