"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { docsMarkdownV2 as docsMarkdown } from "@/components/docs/docs-content-v2";
import { docsMarkdownV2Fr as docsMarkdownFr } from "@/components/docs/docs-content-v2-fr";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, BookOpen, Search, X } from "lucide-react";
import { toast } from "sonner";
import { SlideUp } from "@/components/motion/SlideUp";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// --- Search ---

interface Section {
  id: string;
  title: string;
  titleLower: string;
  level: number;
  textLower: string;
}

interface SearchHit {
  section: Section;
  titleMatch: boolean;
}

function parseSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let current: { title: string; level: number; lines: string[] } | null = null;
  let inCodeBlock = false;
  const slugCounts = new Map<string, number>();

  const flush = () => {
    if (!current) return;
    const baseSlug = slugify(current.title);
    const count = slugCounts.get(baseSlug) || 0;
    slugCounts.set(baseSlug, count + 1);
    sections.push({
      id: count === 0 ? baseSlug : `${baseSlug}-${count}`,
      title: current.title,
      titleLower: current.title.toLowerCase(),
      level: current.level,
      textLower: current.lines.join(" ").toLowerCase(),
    });
  };

  for (const line of lines) {
    if (line.startsWith("\`\`\`")) {
      inCodeBlock = !inCodeBlock;
      if (current) current.lines.push(line);
      continue;
    }
    if (inCodeBlock) {
      if (current) current.lines.push(line);
      continue;
    }
    const match = line.match(/^(#{2,4})\s+(.+)/);
    if (match) {
      flush();
      current = { title: match[2], level: match[1].length, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return sections;
}

function quickSearch(sections: Section[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const s of sections) {
    const titleMatch = s.titleLower.includes(q);
    if (titleMatch || s.textLower.includes(q)) {
      hits.push({ section: s, titleMatch });
    }
  }
  hits.sort((a, b) => (a.titleMatch === b.titleMatch ? 0 : a.titleMatch ? -1 : 1));
  return hits;
}

export default function DocsPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const t = useDictionary();
  const locale = useLocale();
  const content = locale === "fr" ? docsMarkdownFr : docsMarkdown;
  const [mounted, setMounted] = useState(false);

  // Search state
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selIdx, setSelIdx] = useState(0);

  const sections = useMemo(() => parseSections(content), [content]);
  const hits = useMemo(() => quickSearch(sections, search), [sections, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration gate: must run once after mount
  useEffect(() => setMounted(true), []);

  const scrollToText = useCallback((headingText: string) => {
    requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      const headings = container.querySelectorAll("h2[id], h3[id], h4[id]");
      for (const el of headings) {
        if (el.textContent === headingText) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
    });
  }, []);

  const pickResult = useCallback((hit: SearchHit) => {
    setOpen(false);
    setSearch("");
    scrollToText(hit.section.title);
  }, [scrollToText]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); pickResult(hits[selIdx]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); inputRef.current?.blur(); }
  }, [open, hits, selIdx, pickResult]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset selection when results change
  useEffect(() => { setSelIdx(0); }, [hits.length]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync open state with search input
  useEffect(() => { setOpen(search.trim().length > 0 && hits.length > 0); }, [search, hits.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-search-container]")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 -mx-6 -mt-6">
      {/* Left sidebar — Table of Contents, scrolls independently */}
      <aside className="hidden xl:flex w-64 shrink-0 border-r flex-col overflow-y-auto py-6 pr-6 pl-4">
        {mounted && <TableOfContents contentRef={scrollRef} contentKey={locale} />}
      </aside>

      {/* Main content — scrollable */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <SlideUp>
            <div className="mb-6">
              <div className="flex items-center gap-2 justify-end mb-3">
                <Button variant="outline" size="sm" onClick={handleSaveMarkdown}>
                  <Download className="mr-2 h-4 w-4" />
                  {t.docs.saveMarkdown}
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">{t.docs.title}</h1>
                  <p className="text-muted-foreground">
                    {t.docs.subtitle}
                  </p>
                </div>
              </div>
            </div>
          </SlideUp>

          {/* Search bar */}
          <div className="relative mb-8 max-w-2xl" data-search-container>
            <Search className="absolute left-3 top-[13px] h-4 w-4 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => search.trim() && hits.length > 0 && setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder={locale === "fr" ? "Rechercher dans la documentation..." : "Search documentation..."}
              className="pl-10 pr-10 h-11"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setOpen(false); }}
                className="absolute right-3 top-[13px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Dropdown results */}
            {open && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-lg border bg-popover shadow-lg overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  {hits.slice(0, 10).map((hit, i) => (
                    <button
                      key={hit.section.id}
                      onClick={() => pickResult(hit)}
                      onMouseEnter={() => setSelIdx(i)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm border-b border-border/40 last:border-0 transition-colors",
                        i === selIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                      )}
                    >
                      <span className={cn("font-medium", hit.titleMatch && i !== selIdx && "text-primary")}>
                        {hit.section.title}
                      </span>
                      {hit.section.level > 2 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          — {sections.find((s) => s.level === 2 && sections.indexOf(s) < sections.indexOf(hit.section))?.title}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-1.5 border-t bg-muted/30 text-[11px] text-muted-foreground">
                  <span>{hits.length} {hits.length === 1 ? (locale === "fr" ? "résultat" : "result") : (locale === "fr" ? "résultats" : "results")}</span>
                  <span>↑↓ nav · enter go · esc close</span>
                </div>
              </div>
            )}
          </div>

          <article className="pb-24">
            <MarkdownRenderer
              content={content}
              headingIds
              slugify={slugify}
            />
          </article>
        </div>
      </div>

    </div>
  );
}
