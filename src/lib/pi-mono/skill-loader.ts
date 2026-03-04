// Skill Loader — transforms DB skill documents into prompt content

import { type SkillDoc } from "@/lib/firebase/firestore";

export interface ParsedSkill {
  name: string;
  description: string;
  frontmatter: Record<string, string>;
  body: string;
}

export function parseSkillContent(skill: SkillDoc): ParsedSkill {
  const content = skill.content;
  const frontmatter: Record<string, string> = {};
  let body = content;

  // Parse YAML frontmatter
  if (content.startsWith("---")) {
    const endIndex = content.indexOf("---", 3);
    if (endIndex !== -1) {
      const fmBlock = content.slice(3, endIndex).trim();
      for (const line of fmBlock.split("\n")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          frontmatter[key] = value;
        }
      }
      body = content.slice(endIndex + 3).trim();
    }
  }

  return {
    name: skill.name,
    description: skill.description,
    frontmatter,
    body,
  };
}

export function formatSkillsForPrompt(skills: SkillDoc[]): string {
  if (skills.length === 0) return "";

  const parsed = skills.map(parseSkillContent);
  const sections = parsed.map(
    (s) =>
      `<skill name="${s.name}" description="${s.description}">\n${s.body}\n</skill>`
  );

  return `<skills>\n${sections.join("\n\n")}\n</skills>`;
}
