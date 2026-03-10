"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { TableOfContents } from "@/components/docs/TableOfContents";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { Input } from "@/components/ui/input";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";
import { Search, X, BookOpen, Sparkles, Lightbulb, ArrowRight, CornerDownLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// --- Search engine ---

interface SearchIndex {
  id: string;
  title: string;
  level: number;
  /** Plain text content (markdown stripped) for searching */
  plainText: string;
  /** Original markdown content */
  markdown: string;
}

/** Strip markdown syntax for plain-text search */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // code blocks
    .replace(/`[^`]+`/g, " ")        // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/[#*_~|>]/g, "")        // md chars
    .replace(/\|/g, " ")             // table pipes
    .replace(/-{3,}/g, " ")          // hr
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse markdown into indexable sections */
function buildIndex(markdown: string): SearchIndex[] {
  const lines = markdown.split("\n");
  const sections: SearchIndex[] = [];
  let current: { title: string; level: number; lines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^(#{2,4})\s+(.+)/);
    if (match) {
      if (current) {
        const md = current.lines.join("\n");
        sections.push({
          id: slugify(current.title),
          title: current.title,
          level: current.level,
          plainText: stripMarkdown(md).toLowerCase(),
          markdown: md,
        });
      }
      current = { title: match[2], level: match[1].length, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    const md = current.lines.join("\n");
    sections.push({
      id: slugify(current.title),
      title: current.title,
      level: current.level,
      plainText: stripMarkdown(md).toLowerCase(),
      markdown: md,
    });
  }
  return sections;
}

interface SearchResult {
  section: SearchIndex;
  score: number;
  /** Contextual snippet around the best match */
  snippet: string;
  /** Which terms matched */
  matchedTerms: string[];
}

/**
 * Fuzzy search with scoring. Ranks results by:
 * - Title exact match (highest)
 * - Title word-start match
 * - Title substring match
 * - Content exact phrase match
 * - Content all-terms match
 * - Content partial-terms match (fuzzy)
 */
function searchSections(
  index: SearchIndex[],
  query: string
): SearchResult[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];

  const terms = raw.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];

  for (const section of index) {
    const titleLower = section.title.toLowerCase();
    const text = section.plainText;
    let score = 0;
    const matchedTerms: string[] = [];

    // --- Title scoring ---
    // Exact title match
    if (titleLower === raw) {
      score += 100;
      matchedTerms.push(...terms);
    }
    // Title starts with query
    else if (titleLower.startsWith(raw)) {
      score += 80;
      matchedTerms.push(...terms);
    }
    // Title contains full query as substring
    else if (titleLower.includes(raw)) {
      score += 60;
      matchedTerms.push(...terms);
    }
    // Individual terms in title
    else {
      for (const term of terms) {
        if (titleLower.includes(term)) {
          score += 30;
          matchedTerms.push(term);
        }
      }
    }

    // --- Content scoring ---
    // Full phrase match in content
    if (text.includes(raw)) {
      score += 40;
      matchedTerms.push(...terms);
    } else {
      // Per-term content matching
      let termMatches = 0;
      for (const term of terms) {
        if (text.includes(term)) {
          termMatches++;
          score += 10;
          if (!matchedTerms.includes(term)) matchedTerms.push(term);
        } else {
          // Fuzzy: check if term is a prefix of any word in content
          const words = text.split(/\s+/);
          const fuzzyMatch = words.some((w) => w.startsWith(term) || (term.length >= 3 && w.includes(term)));
          if (fuzzyMatch) {
            termMatches++;
            score += 5;
            if (!matchedTerms.includes(term)) matchedTerms.push(term);
          }
        }
      }
      // Bonus for matching all terms
      if (termMatches === terms.length) {
        score += 15;
      }
    }

    // Boost h2 sections slightly (main topics)
    if (section.level === 2) score += 3;

    if (score > 0) {
      // Extract contextual snippet
      const snippet = extractSnippet(text, terms);
      results.push({ section, score, snippet, matchedTerms });
    }
  }

  // Sort by score descending, then by section order for equal scores
  results.sort((a, b) => b.score - a.score);

  return results;
}

/** Extract a ~120 char snippet around the best matching position */
function extractSnippet(text: string, terms: string[]): string {
  // Find the earliest position where any term appears
  let bestPos = -1;
  for (const term of terms) {
    const idx = text.indexOf(term);
    if (idx !== -1 && (bestPos === -1 || idx < bestPos)) {
      bestPos = idx;
    }
  }
  if (bestPos === -1) return text.slice(0, 120) + (text.length > 120 ? "…" : "");

  const start = Math.max(0, bestPos - 40);
  const end = Math.min(text.length, bestPos + 80);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet += "…";
  return snippet;
}

// --- Component ---

interface HowItWorksProps {
  id?: string;
}

export function HowItWorks({ id }: HowItWorksProps) {
  const t = useDictionary();
  const locale = useLocale();
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Lazy load content
  const [content, setContent] = useState<string>("");
  useEffect(() => {
    if (locale === "fr") {
      import("./docs-content-v2-fr").then((m) => setContent(m.docsMarkdownV2Fr));
    } else {
      import("./docs-content-v2").then((m) => setContent(m.docsMarkdownV2));
    }
  }, [locale]);

  // Build search index once
  const index = useMemo(() => buildIndex(content), [content]);

  // Search results (debounced-ish via useMemo)
  const searchResults = useMemo(() => searchSections(index, search), [index, search]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIdx(0);
  }, [searchResults.length, search]);

  // Show dropdown when typing
  useEffect(() => {
    setShowResults(search.trim().length > 0);
  }, [search]);

  const scrollToHeading = useCallback((headingId: string) => {
    const container = contentRef.current;
    if (!container) return;
    const el = container.querySelector(`#${CSS.escape(headingId)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    setShowResults(false);
    // Small delay to let dropdown close before scrolling
    requestAnimationFrame(() => {
      scrollToHeading(result.section.id);
    });
  }, [scrollToHeading]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleResultClick(searchResults[selectedIdx]);
    } else if (e.key === "Escape") {
      setShowResults(false);
      searchInputRef.current?.blur();
    }
  }, [showResults, searchResults, selectedIdx, handleResultClick]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showResults) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-search-container]")) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showResults]);

  // Keyboard shortcut: Ctrl+K or / to focus search
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, []);

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
            onClick={() => scrollToHeading(slugify(locale === "fr" ? "Créer votre premier agent" : "Create Your First Agent"))}
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

        {/* Search bar with dropdown results */}
        <div className="relative mb-8 max-w-2xl mx-auto" data-search-container>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => search.trim() && setShowResults(true)}
              onKeyDown={handleKeyDown}
              placeholder={t.landing.howItWorks?.searchPlaceholder || "Search documentation... (e.g. tools, grading, MCP)"}
              className="pl-10 pr-20 h-11"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {search ? (
                <button
                  onClick={() => { setSearch(""); setShowResults(false); }}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              )}
            </div>
          </div>

          {/* Search results dropdown */}
          <AnimatePresence>
            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 top-full mt-2 w-full rounded-xl border bg-popover shadow-lg overflow-hidden"
              >
                <div className="max-h-[360px] overflow-y-auto">
                  {searchResults.slice(0, 12).map((result, i) => (
                    <button
                      key={result.section.id + "-" + i}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border/50 last:border-0 transition-colors",
                        i === selectedIdx ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {result.section.level === 2 ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded px-1.5 py-0.5">
                            {result.section.title}
                          </span>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground/60">
                              {/* Find parent h2 */}
                              {index.find((s) => s.level === 2 && index.indexOf(s) < index.indexOf(result.section))?.title}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                            <span className="text-sm font-medium">{result.section.title}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        <HighlightedSnippet text={result.snippet} terms={result.matchedTerms} />
                      </p>
                    </button>
                  ))}
                </div>

                {/* Footer with hint */}
                <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground">
                  <span>
                    {searchResults.length} {searchResults.length === 1
                      ? (t.landing.howItWorks?.resultSingular || "result")
                      : (t.landing.howItWorks?.resultPlural || "results")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                      <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 text-[10px]">↑↓</kbd>
                      {locale === "fr" ? "naviguer" : "navigate"}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <CornerDownLeft className="h-3 w-3" />
                      {locale === "fr" ? "aller" : "go"}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <kbd className="inline-flex h-4 items-center rounded border bg-muted px-1 text-[10px]">esc</kbd>
                      {locale === "fr" ? "fermer" : "close"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {showResults && search.trim() && searchResults.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 top-full mt-2 w-full rounded-xl border bg-popover shadow-lg p-6 text-center"
              >
                <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">
                  {t.landing.howItWorks?.noResults || "No results found"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {t.landing.howItWorks?.noResultsHint || "Try different keywords or browse the full documentation."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content area with TOC sidebar */}
        <div className="flex gap-0 rounded-xl border bg-card/50 overflow-hidden" style={{ height: "80vh" }}>
          {/* Left sidebar — uses proven TableOfContents component */}
          <aside className="hidden lg:block w-60 shrink-0 border-r overflow-y-auto p-4">
            <TableOfContents
              contentRef={contentRef}
              contentKey={content.length}
              title={t.landing.howItWorks?.tocTitle || "On this page"}
            />
          </aside>

          {/* Main content — scrollable */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-6 lg:p-10">
            <article className="mx-auto max-w-4xl">
              <MarkdownRenderer
                content={content}
                headingIds
                slugify={slugify}
              />
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Highlight matched terms within the snippet */
function HighlightedSnippet({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;

  // Build a regex that matches any of the terms (case-insensitive)
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = terms.some((t) => part.toLowerCase() === t.toLowerCase());
        return isMatch ? (
          <mark key={i} className="bg-primary/20 text-primary rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}
