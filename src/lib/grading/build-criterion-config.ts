/**
 * Build criterion config from the meta-agent's "expected" field.
 * Converts the human-readable expected behavior into the structured config
 * that each criterion evaluator needs.
 */
export function buildCriterionConfig(
  criterionType: string,
  expected: string
): Record<string, unknown> {
  switch (criterionType) {
    case "llm_judge":
      return {
        rubric: expected || "Evaluate the quality, accuracy, and helpfulness of the agent's response.",
        scoreThreshold: 0.7,
      };

    case "output_match": {
      // If expected is a behavioral description (long sentence), fall back to llm_judge
      // because contains-matching a description like "L'agent demande poliment..." will never work
      if (expected && looksLikeBehaviorDescription(expected)) {
        return {
          _fallbackToJudge: true,
          rubric: expected,
          scoreThreshold: 0.7,
        };
      }
      return {
        mode: "contains" as const,
        pattern: expected ? extractPatterns(expected) : [],
        caseSensitive: false,
      };
    }

    case "tool_usage":
      return {
        expectedTools: expected ? extractToolNames(expected) : [],
        ordered: false,
        allowExtra: true,
      };

    case "schema_validation":
      return {
        jsonSchema: { type: "object" },
      };

    case "safety_check":
      return {
        forbiddenPatterns: [],
        scanToolCalls: true,
      };

    case "custom_script":
      return {
        code: `// Auto-generated: check expected behavior\nconst output = events.assistantOutput;\nreturn { passed: output.length > 0, score: output.length > 0 ? 1 : 0, message: output.length > 0 ? "Output produced" : "No output" };`,
      };

    default:
      // Default to llm_judge config
      return {
        rubric: expected || "Evaluate the quality, accuracy, and helpfulness of the agent's response.",
        scoreThreshold: 0.7,
      };
  }
}

/**
 * Detect if the expected text is a behavioral description (natural language)
 * rather than a literal pattern to match.
 * E.g. "L'agent demande poliment à l'utilisateur..." → behavioral
 * E.g. "error" or "status: ok" → literal pattern
 */
function looksLikeBehaviorDescription(text: string): boolean {
  // Short patterns are likely literal keywords
  if (text.length < 30) return false;
  // Contains agent-referencing words → behavioral description
  const behaviorIndicators = /\b(l'agent|the agent|agent should|doit|devrait|invite|signale|demande|responds?|produces?|returns?|outputs?|displays?|shows?|affiche|fournit|propose|génère|indique)\b/i;
  return behaviorIndicators.test(text);
}

/**
 * Extract keywords/phrases from expected behavior text for output_match patterns.
 * Splits on commas, "and", "or" and filters out common filler words.
 */
function extractPatterns(expected: string): string[] {
  // If it looks like a single keyword or short phrase, use as-is
  if (expected.length < 50 && !expected.includes(",")) {
    return [expected.trim()];
  }

  // Split on commas and common conjunctions
  const parts = expected
    .split(/[,;]|\band\b|\bor\b|\bet\b|\bou\b/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);

  return parts.length > 0 ? parts : [expected.trim()];
}

/**
 * Extract tool names from expected behavior text.
 * Looks for patterns like "use tool_name" or "call tool_name" or just tool-like identifiers.
 */
function extractToolNames(expected: string): string[] {
  const toolPattern = /(?:use|call|invoke|utiliser|appeler)\s+(\w+)/gi;
  const tools: string[] = [];
  let match;
  while ((match = toolPattern.exec(expected)) !== null) {
    tools.push(match[1]);
  }
  return tools;
}
