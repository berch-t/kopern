"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";
import { Search, X, BookOpen, Sparkles, Lightbulb, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

// --- Component ---

interface HowItWorksProps {
  id?: string;
}

export function HowItWorks({ id }: HowItWorksProps) {
  const t = useDictionary();
  const locale = useLocale();
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selIdx, setSelIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  // Lazy load content
  const [content, setContent] = useState("");
  useEffect(() => {
    if (locale === "fr") {
      import("./docs-content-v2-fr").then((m) => setContent(m.docsMarkdownV2Fr));
    } else {
      import("./docs-content-v2").then((m) => setContent(m.docsMarkdownV2));
    }
  }, [locale]);

  const sections = useMemo(() => parseSections(content), [content]);
  const hits = useMemo(() => quickSearch(sections, search), [sections, search]);

  // Memoize the heavy markdown render — only re-runs when content changes, not on search keystrokes
  const renderedMarkdown = useMemo(
    () => content ? <MarkdownRenderer content={content} headingIds slugify={slugify} /> : null,
    [content]
  );

  const scrollToText = useCallback((headingText: string) => {
    requestAnimationFrame(() => {
      const container = contentRef.current;
      if (!container) return;
      // Find heading by text content — matches DOM regardless of ID generation
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
    else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  }, [open, hits, selIdx, pickResult]);

  useEffect(() => { setSelIdx(0); }, [hits.length]);
  useEffect(() => { setOpen(search.trim().length > 0 && hits.length > 0); }, [search, hits.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-search-container]")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content.trim());
    setCopied(true);
    toast.success(locale === "fr" ? "Documentation copiée !" : "Documentation copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [content, locale]);

  if (!content) return null;

  return (
    <section id={id} className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {t.landing.howItWorks?.title || "How it"}{" "}
            <span className="text-primary">{t.landing.howItWorks?.titleAccent || "Works"}</span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
            {t.landing.howItWorks?.subtitle || "Complete guide to building, testing, and deploying AI agents with Kopern."}
          </p>
        </div>

        {/* Quick action cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          <LocalizedLink href="/examples">
            <div className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <p className="font-medium text-sm">{t.landing.howItWorks?.startTemplate || "Start from a Template"}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.landing.howItWorks?.startTemplateDesc || "Browse 15+ pre-built agents and customize them for your needs."}
              </p>
            </div>
          </LocalizedLink>
          <div
            className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => scrollToText(locale === "fr" ? "Créer votre premier agent" : "Create Your First Agent")}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <BookOpen className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="font-medium text-sm">{t.landing.howItWorks?.quickStart || "Quick Start Guide"}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.landing.howItWorks?.quickStartDesc || "Step-by-step guide to create and deploy your first agent in minutes."}
            </p>
          </div>
          <div
            className="rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => {
              const el = document.getElementById("hero-creator");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              else window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
              <p className="font-medium text-sm">{t.landing.howItWorks?.useWizard || "Use the AI Wizard"}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.landing.howItWorks?.useWizardDesc || "Describe your agent in plain text and let AI generate the full configuration."}
            </p>
          </div>
        </div>

        {/* Search + Copy button row */}
        <div className="mb-8 flex items-start justify-center gap-3">
          <div className="relative w-full max-w-2xl" data-search-container>
            <Search className="absolute left-3 top-[13px] h-4 w-4 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => search.trim() && hits.length > 0 && setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder={t.landing.howItWorks?.searchPlaceholder || "Search documentation... (e.g. tools, grading, MCP)"}
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
                  <span>{hits.length} {hits.length === 1 ? "result" : "results"}</span>
                  <span>↑↓ nav · enter go · esc close</span>
                </div>
              </div>
            )}
          </div>

          {/* Copy markdown button */}
          <div className="hidden lg:block shrink-0">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopy}
                    className="flex h-11 w-11 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[240px]">
                  <p className="font-medium text-sm mb-1">
                    {locale === "fr" ? "Copier la documentation entière en Markdown" : "Copy full docs as Markdown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {locale === "fr"
                      ? "Collez dans ChatGPT, Claude ou tout LLM pour le rendre expert Kopern."
                      : "Paste into ChatGPT, Claude or any LLM to make it a Kopern expert."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Content area with TOC sidebar */}
        <div className="flex gap-0 rounded-xl border bg-card/50 overflow-hidden" style={{ height: "80vh" }}>
          {/* Left sidebar — TOC reads headings from contentRef DOM */}
          <aside className="hidden lg:block w-60 shrink-0 border-r overflow-y-auto p-4">
            <TableOfContents
              contentRef={contentRef}
              contentKey={content.length}
              title={t.landing.howItWorks?.tocTitle || "On this page"}
            />
          </aside>

          {/* Main scrollable content — ref stays here, not inside a memo boundary */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-6 lg:p-10">
            <article className="mx-auto max-w-4xl">
              {renderedMarkdown}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
