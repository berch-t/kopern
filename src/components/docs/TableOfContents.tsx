"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  contentRef: React.RefObject<HTMLElement | null>;
  /** Optional static items — if not provided, items are extracted from the DOM */
  items?: TocItem[];
}

export function TableOfContents({ contentRef, items: staticItems }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>(staticItems ?? []);
  const [activeId, setActiveId] = useState<string>("");

  // Extract TOC items from actual DOM headings (source of truth)
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    // Small delay to ensure MarkdownRenderer has rendered heading IDs
    const timer = setTimeout(() => {
      const headings = container.querySelectorAll("h2[id], h3[id], h4[id]");
      const extracted: TocItem[] = [];
      headings.forEach((el) => {
        const tag = el.tagName.toLowerCase();
        const level = tag === "h2" ? 2 : tag === "h3" ? 3 : 4;
        extracted.push({
          id: el.id,
          text: el.textContent || "",
          level,
        });
      });
      setItems(extracted);
    }, 100);

    return () => clearTimeout(timer);
  }, [contentRef, staticItems]);

  // Track active heading with scroll listener
  useEffect(() => {
    const container = contentRef.current;
    if (!container || items.length === 0) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      let current = "";

      for (const item of items) {
        const el = container.querySelector(`#${CSS.escape(item.id)}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - containerRect.top;
        if (top <= 120) {
          current = item.id;
        }
      }

      setActiveId(current);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [items, contentRef]);

  const handleClick = useCallback(
    (id: string) => {
      const container = contentRef.current;
      if (!container) return;
      const el = container.querySelector(`#${CSS.escape(id)}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [contentRef]
  );

  if (items.length === 0) return null;

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </p>
      {items.map((item, i) => (
        <button
          key={`${item.id}-${i}`}
          onClick={() => handleClick(item.id)}
          className={cn(
            "block w-full text-left text-sm py-1 transition-colors hover:text-foreground",
            item.level === 2 && "pl-0",
            item.level === 3 && "pl-4",
            item.level === 4 && "pl-8",
            activeId === item.id
              ? "text-primary font-medium"
              : "text-muted-foreground"
          )}
        >
          {item.text}
        </button>
      ))}
    </nav>
  );
}
