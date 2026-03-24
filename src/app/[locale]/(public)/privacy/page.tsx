"use client";

import { useDictionary } from "@/providers/LocaleProvider";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  const t = useDictionary();
  const p = t.privacy;

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-8">
      <SlideUp>
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{p.title}</h1>
            <p className="text-sm text-muted-foreground">{p.lastUpdated}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{p.intro}</p>
      </SlideUp>

      <FadeIn delay={0.1}>
        <Section title={p.controllerTitle}>
          <p>{p.controllerText}</p>
        </Section>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Section title={p.dataCollectedTitle}>
          <p className="mb-3">{p.dataCollectedIntro}</p>
          <ul className="space-y-2">
            <Li>{p.dataAccount}</Li>
            <Li>{p.dataApiKeys}</Li>
            <Li>{p.dataUsage}</Li>
            <Li>{p.dataSessions}</Li>
            <Li>{p.dataGithub}</Li>
            <Li>{p.dataPayment}</Li>
          </ul>
        </Section>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Section title={p.legalBasisTitle}>
          <ul className="space-y-2">
            <Li>{p.legalContract}</Li>
            <Li>{p.legalConsent}</Li>
            <Li>{p.legalInterest}</Li>
            <Li>{p.legalObligation}</Li>
          </ul>
        </Section>
      </FadeIn>

      <FadeIn delay={0.25}>
        <Section title={p.cookiesTitle}>
          <p className="mb-3">{p.cookiesIntro}</p>
          <ul className="space-y-2">
            <Li><code className="text-xs bg-muted px-1.5 py-0.5 rounded">NEXT_LOCALE</code> — {p.cookieLocale}</Li>
            <Li><code className="text-xs bg-muted px-1.5 py-0.5 rounded">Firebase Auth</code> — {p.cookieAuth}</Li>
            <Li><code className="text-xs bg-muted px-1.5 py-0.5 rounded">kopern_consent</code> — {p.cookieConsent}</Li>
          </ul>
          <p className="mt-3 text-sm font-medium text-green-600 dark:text-green-400">{p.cookiesNote}</p>
        </Section>
      </FadeIn>

      <FadeIn delay={0.3}>
        <Section title={p.retentionTitle}>
          <p>{p.retentionText}</p>
        </Section>
      </FadeIn>

      <FadeIn delay={0.35}>
        <Section title={p.thirdPartiesTitle}>
          <ul className="space-y-2">
            <Li>{p.thirdFirebase}</Li>
            <Li>{p.thirdStripe}</Li>
            <Li>{p.thirdVercel}</Li>
            <Li>{p.thirdLlm}</Li>
          </ul>
        </Section>
      </FadeIn>

      <FadeIn delay={0.4}>
        <Section title={p.rightsTitle}>
          <p className="mb-3">{p.rightsIntro}</p>
          <ul className="space-y-2">
            <Li>{p.rightAccess}</Li>
            <Li>{p.rightRectification}</Li>
            <Li>{p.rightErasure}</Li>
            <Li>{p.rightPortability}</Li>
            <Li>{p.rightRestriction}</Li>
            <Li>{p.rightObjection}</Li>
            <Li>{p.rightComplaint}</Li>
          </ul>
        </Section>
      </FadeIn>

      <FadeIn delay={0.45}>
        <Section title={p.transfersTitle}>
          <p>{p.transfersText}</p>
        </Section>
      </FadeIn>

      <FadeIn delay={0.5}>
        <Section title={p.securityTitle}>
          <p>{p.securityText}</p>
        </Section>
      </FadeIn>

      <FadeIn delay={0.55}>
        <Section title={p.changesTitle}>
          <p>{p.changesText}</p>
        </Section>
      </FadeIn>

      <FadeIn delay={0.6}>
        <Section title={p.contactTitle}>
          <p>{p.contactText}</p>
        </Section>
      </FadeIn>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </CardContent>
    </Card>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-primary mt-1 shrink-0">&#8226;</span>
      <span>{children}</span>
    </li>
  );
}
