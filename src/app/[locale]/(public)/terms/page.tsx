"use client";

import { useDictionary } from "@/providers/LocaleProvider";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function TermsPage() {
  const t = useDictionary();
  const s = t.terms;

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-8">
      <SlideUp>
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{s.title}</h1>
            <p className="text-sm text-muted-foreground">{s.lastUpdated}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{s.intro}</p>
      </SlideUp>

      {[
        { title: s.acceptanceTitle, text: s.acceptanceText },
        { title: s.serviceTitle, text: s.serviceText },
        { title: s.accountTitle, text: s.accountText },
        { title: s.usageTitle, text: s.usageText },
        { title: s.billingTitle, text: s.billingText },
        { title: s.ipTitle, text: s.ipText },
        { title: s.liabilityTitle, text: s.liabilityText },
        { title: s.terminationTitle, text: s.terminationText },
        { title: s.lawTitle, text: s.lawText },
        { title: s.changesTitle, text: s.changesText },
        { title: s.contactTitle, text: s.contactText },
      ].map((section, i) => (
        <FadeIn key={section.title} delay={0.1 + i * 0.05}>
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{section.text}</p>
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </div>
  );
}
