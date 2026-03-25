"use client";

import { useState, useMemo } from "react";
import { useLocalizedUseCases } from "@/hooks/useLocalizedUseCases";
import { UseCaseCard } from "@/components/examples/UseCaseCard";
import { Button } from "@/components/ui/button";
import { Lightbulb, Database } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { useDictionary } from "@/providers/LocaleProvider";
import { Badge } from "@/components/ui/badge";

const DATAGOUV_DOMAIN = "data.gouv.fr / Open Data";

export default function ExamplesPage() {
  const t = useDictionary();
  const localizedCases = useLocalizedUseCases();
  const [activeDomain, setActiveDomain] = useState("All");

  // Split templates into regular and datagouv
  const datagouvCases = useMemo(
    () => localizedCases.filter((uc) => uc.domain === DATAGOUV_DOMAIN),
    [localizedCases]
  );
  const regularCases = useMemo(
    () => localizedCases.filter((uc) => uc.domain !== DATAGOUV_DOMAIN),
    [localizedCases]
  );

  const domains = useMemo(
    () => ["All", ...Array.from(new Set(regularCases.map((uc) => uc.domain)))],
    [regularCases]
  );

  const filtered = useMemo(
    () =>
      activeDomain === "All"
        ? regularCases
        : regularCases.filter((uc) => uc.domain === activeDomain),
    [activeDomain, regularCases]
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

      {/* data.gouv.fr MCP Section */}
      {datagouvCases.length > 0 && (
        <SlideUp>
          <div className="rounded-xl border-2 border-blue-500/30 bg-blue-500/5 p-6 mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Database className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{t.examples.datagouvTitle}</h2>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
                    MCP
                  </Badge>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
              {t.examples.datagouvSubtitle}
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {datagouvCases.map((uc, i) => (
                <UseCaseCard key={uc.slug} useCase={uc} index={i} />
              ))}
            </div>
          </div>
        </SlideUp>
      )}

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
