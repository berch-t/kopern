"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQJsonLd, type FAQItem } from "./JsonLd";

interface FAQSectionProps {
  title?: string;
  subtitle?: string;
  faqs: FAQItem[];
  injectJsonLd?: boolean;
  defaultOpenIndex?: number;
  className?: string;
}

export function FAQSection({
  title = "Frequently Asked Questions",
  subtitle,
  faqs,
  injectJsonLd = false,
  defaultOpenIndex = 0,
  className,
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex);

  return (
    <section
      id="faq"
      className={cn("py-16 md:py-24 max-w-4xl mx-auto px-4 md:px-6", className)}
      aria-labelledby="faq-title"
    >
      {injectJsonLd && <FAQJsonLd faqs={faqs} />}

      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
          <HelpCircle className="h-3.5 w-3.5" />
          FAQ
        </div>
        <h2 id="faq-title" className="text-3xl md:text-4xl font-bold tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </header>

      <div className="space-y-3">
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <article
              key={i}
              className={cn(
                "rounded-lg border bg-card/50 backdrop-blur-sm overflow-hidden transition-colors",
                isOpen && "border-primary/40 bg-card"
              )}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${i}`}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <h3 className="text-base md:text-lg font-semibold">
                  {faq.question}
                </h3>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180 text-primary"
                  )}
                />
              </button>
              <div
                id={`faq-answer-${i}`}
                className={cn(
                  "grid transition-all",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm md:text-base text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
