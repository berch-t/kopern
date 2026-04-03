"use client";

import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface MarkdownContentProps {
  content: string;
}

const IMAGE_URL_TAG_RE = /\[IMAGE_URL\](https?:\/\/[^\s[\]]+)\[\/IMAGE_URL\]/g;
const IMAGE_MD_RE = /!\[[^\]]*\]\(https:\/\/storage\.googleapis\.com\/[^)]+\)/g;

/** Strip generated image references — images are shown in ToolCallDisplay instead. */
function stripGeneratedImages(content: string): string {
  return content
    .replace(IMAGE_URL_TAG_RE, "")
    .replace(IMAGE_MD_RE, "")
    .trim();
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const text = stripGeneratedImages(content);

  return (
    <div>
      <MarkdownRenderer content={text} compact />
    </div>
  );
}
