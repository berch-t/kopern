"use client";

import { useState, useCallback, Children } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-gray-400 opacity-0 backdrop-blur transition-all hover:bg-white/20 hover:text-white group-hover:opacity-100"
      title="Copy code"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

interface MarkdownRendererProps {
  content: string;
  /** Compact mode for chat bubbles — tighter spacing */
  compact?: boolean;
  /** Generate heading IDs for ToC linking */
  headingIds?: boolean;
  /** Custom slug function for heading IDs */
  slugify?: (text: string) => string;
}

function defaultSlugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function MarkdownRenderer({
  content,
  compact = false,
  headingIds = false,
  slugify: slugifyFn = defaultSlugify,
}: MarkdownRendererProps) {
  // Extract plain text from React children (handles nested <code>, <strong>, etc.)
  function extractText(node: React.ReactNode): string {
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (!node) return "";
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (typeof node === "object" && node !== null && "props" in node) {
      const el = node as React.ReactElement<{ children?: React.ReactNode }>;
      return extractText(el.props.children);
    }
    return Children.toArray(node).map(extractText).join("");
  }

  // Track seen slugs to deduplicate heading IDs
  const slugCounts = new Map<string, number>();

  const headingComponent = (Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") => {
    return function Heading({ children }: { children?: React.ReactNode }) {
      if (headingIds) {
        const text = extractText(children);
        const baseSlug = slugifyFn(text);
        const count = slugCounts.get(baseSlug) || 0;
        slugCounts.set(baseSlug, count + 1);
        const id = count === 0 ? baseSlug : `${baseSlug}-${count}`;
        return <Tag id={id} className="scroll-mt-6">{children}</Tag>;
      }
      return <Tag>{children}</Tag>;
    };
  };

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        // Headings
        "prose-h1:text-3xl prose-h1:font-bold prose-h1:mt-10 prose-h1:mb-4",
        "prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3 prose-h2:border-b prose-h2:border-border prose-h2:pb-2",
        "prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-2",
        "prose-h4:text-lg prose-h4:font-medium prose-h4:mt-4 prose-h4:mb-2",
        // Paragraphs & lists
        "prose-p:leading-7",
        "prose-ul:my-3 prose-ol:my-3 prose-li:my-1",
        // Links
        "prose-a:text-primary prose-a:underline prose-a:underline-offset-4",
        // Blockquotes
        "prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:rounded-r-md prose-blockquote:py-1 prose-blockquote:px-4",
        // Horizontal rules
        "prose-hr:border-border prose-hr:my-8",
        // Tables
        "prose-table:border prose-table:border-border",
        "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-2",
        "prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2",
        // Code blocks
        "prose-pre:p-0 prose-pre:bg-transparent prose-pre:my-4",
        // Inline code
        "prose-code:before:content-[''] prose-code:after:content-['']",
        // Compact overrides for chat
        compact && [
          "prose-sm",
          "prose-p:my-1 prose-p:leading-6",
          "prose-headings:my-2",
          "prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
          "prose-pre:my-2",
          "prose-hr:my-4",
        ]
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: headingComponent("h1"),
          h2: headingComponent("h2"),
          h3: headingComponent("h3"),
          h4: headingComponent("h4"),
          h5: headingComponent("h5"),
          h6: headingComponent("h6"),
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isBlock = match || codeString.includes("\n");

            if (isBlock) {
              return (
                <div className="group relative">
                  <CopyButton code={codeString} />
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match ? match[1] : "text"}
                    PreTag="div"
                    className={cn(
                      "!rounded-lg !my-0",
                      compact ? "!text-xs" : "!text-sm"
                    )}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code
                className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          hr() {
            return <hr className="border-border my-8" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
