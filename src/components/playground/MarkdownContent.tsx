"use client";

import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return <MarkdownRenderer content={content} compact />;
}
