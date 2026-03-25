import type { VerticalTemplate } from "@/data/vertical-templates";

/**
 * Replace all {{variableName}} placeholders in a template string
 * with values from the answers map.
 * Unreplaced placeholders are left as-is.
 */
export function hydratePrompt(
  template: string,
  answers: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return answers[key] ?? match;
  });
}

/**
 * Extract the agent name from onboarding answers.
 * Tries common name fields, falls back to template title.
 */
export function extractAgentName(
  template: VerticalTemplate,
  answers: Record<string, string>,
  locale: string
): string {
  return (
    answers.businessName ||
    answers.firmName ||
    answers.agencyName ||
    (locale === "fr" ? template.titleFr : template.title)
  );
}
