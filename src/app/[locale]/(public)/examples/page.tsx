"use client";

import { useState, useMemo } from "react";
import { useLocalizedUseCases } from "@/hooks/useLocalizedUseCases";
import { UseCaseCard } from "@/components/examples/UseCaseCard";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { useDictionary } from "@/providers/LocaleProvider";

export default function ExamplesPage() {
  const t = useDictionary();
  const localizedCases = useLocalizedUseCases();
  const [activeDomain, setActiveDomain] = useState("All");

  const domains = useMemo(
    () => ["All", ...Array.from(new Set(localizedCases.map((uc) => uc.domain)))],
    [localizedCases]
  );

  const filtered = useMemo(
    () =>
      activeDomain === "All"
        ? localizedCases
        : localizedCases.filter((uc) => uc.domain === activeDomain),
    [activeDomain, localizedCases]
  );

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t.examples.title}</h1>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            {t.examples.subtitle}
          </p>
        </div>
      </SlideUp>

      {/* Domain filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {domains.map((domain) => (
          <Button
            key={domain}
            variant={activeDomain === domain ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveDomain(domain)}
          >
            {domain === "All" ? t.common.all : domain}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((uc, i) => (
          <UseCaseCard key={uc.slug} useCase={uc} index={i} />
        ))}
      </div>
    </div>
  );
}
