"use client";

import { useRef, useMemo } from "react";
import { TableOfContents, type TocItem } from "@/components/docs/TableOfContents";
import { docsMarkdown } from "@/components/docs/docs-content";
import { docsMarkdownFr } from "@/components/docs/docs-content-fr";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Download, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { SlideUp } from "@/components/motion/SlideUp";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{2,4})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/`/g, "");
      items.push({ id: slugify(text), text, level });
    }
  }
  return items;
}

export default function DocsPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const t = useDictionary();
  const locale = useLocale();
  const content = locale === "fr" ? docsMarkdownFr : docsMarkdown;
  const tocItems = useMemo(() => extractToc(content), [content]);

  const handleSaveMarkdown = () => {
    const blob = new Blob([content.trim()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kopern-documentation.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.docs.savedMarkdown);
  };

  const handleSaveAsSkill = async () => {
    if (!user) {
      toast.error(t.docs.loginRequired);
      return;
    }
    const skillContent = content.trim();
    await navigator.clipboard.writeText(skillContent);
    toast.success(t.docs.copiedSkill);
  };

  return (
    <div className="flex h-full gap-0">
      {/* Main content — scrollable */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <SlideUp>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">{t.docs.title}</h1>
                  <p className="text-muted-foreground">
                    {t.docs.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSaveMarkdown}>
                  <Download className="mr-2 h-4 w-4" />
                  {t.docs.saveMarkdown}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveAsSkill}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  {t.docs.saveSkill}
                </Button>
              </div>
            </div>
          </SlideUp>

          <article className="pb-24">
            <MarkdownRenderer
              content={content}
              headingIds
              slugify={slugify}
            />
          </article>
        </div>
      </div>

      {/* Right sidebar — Table of Contents */}
      <aside className="hidden xl:block w-64 shrink-0 border-l pl-6 sticky top-0 h-full overflow-y-auto py-6">
        <TableOfContents items={tocItems} contentRef={contentRef} />
      </aside>
    </div>
  );
}
