"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  items: TocItem[];
  contentRef: React.RefObject<HTMLElement | null>;
}

export function TableOfContents({ items, contentRef }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let current = "";

      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        // offsetTop relative to the scrollable container
        const top = el.offsetTop - container.offsetTop;
        if (scrollTop >= top - 100) {
          current = item.id;
        }
      }

      setActiveId(current);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [items, contentRef]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    const container = contentRef.current;
    if (!el || !container) return;
    const top = el.offsetTop - container.offsetTop - 24;
    container.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </p>
      {items.map((item) => (
        <button
          key={item.id}
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
