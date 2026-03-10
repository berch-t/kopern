"use client";

import { useState, useEffect } from "react";
import { type User } from "firebase/auth";
import { onAuthChanged } from "@/lib/firebase/auth";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import {
  Check,
  Minus,
  Lightbulb,
  DollarSign,
  Github,
  LayoutDashboard,
  Zap,
} from "lucide-react";
import { BugReportDialog } from "@/components/feedback/BugReportDialog";
import { motion } from "framer-motion";

type BillingPeriod = "monthly" | "annual";

export default function PricingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const t = useDictionary();

  useEffect(() => {
    const unsubscribe = onAuthChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const tiers = [
    {
      key: "starter" as const,
      price: billing === "monthly" ? t.pricing.tiers.starter.price : t.pricing.tiers.starter.priceAnnual,
      cta: t.pricing.startFree,
      href: user ? "/dashboard" : "/login",
      popular: false,
    },
    {
      key: "pro" as const,
      price: billing === "monthly" ? t.pricing.tiers.pro.price : t.pricing.tiers.pro.priceAnnual,
      cta: t.pricing.getStarted,
      href: user ? "/dashboard" : "/login",
      popular: true,
    },
    {
      key: "usage" as const,
      price: billing === "monthly" ? t.pricing.tiers.usage.price : t.pricing.tiers.usage.priceAnnual,
      cta: t.pricing.startUsage,
      href: user ? "/dashboard" : "/login",
      popular: false,
      payPerUse: true,
    },
    {
      key: "enterprise" as const,
      price: billing === "monthly" ? t.pricing.tiers.enterprise.price : t.pricing.tiers.enterprise.priceAnnual,
      cta: t.pricing.contactSales,
      href: user ? "/dashboard" : "/login",
      popular: false,
    },
  ];

  const featureKeys = [
    "agents",
    "tokensPerMonth",
    "mcpEndpoints",
    "gradingRunsPerMonth",
    "models",
    "support",
    "teams",
    "pipelines",
    "observability",
  ] as const;

  const booleanFeatures = [
    { key: "subAgents", starter: false, pro: true, enterprise: true, usage: true },
    { key: "metaAgent", starter: false, pro: true, enterprise: true, usage: true },
    { key: "sso", starter: false, pro: false, enterprise: true, usage: false },
    { key: "auditLogs", starter: false, pro: false, enterprise: true, usage: false },
    { key: "versionHistory", starter: false, pro: true, enterprise: true, usage: true },
    { key: "batchProcessing", starter: false, pro: true, enterprise: true, usage: true },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center px-6 py-4 max-w-6xl mx-auto">
        {/* Logo — links to landing */}
        <LocalizedLink href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0">
          <img src="/logo_small.png" alt="Kopern" className="h-7" />
        </LocalizedLink>

        {/* Center nav buttons */}
        <div className="flex-1 flex items-center justify-center gap-1">
          <LocalizedLink href="/examples">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Lightbulb className="h-4 w-4" />
              {t.nav.examples}
            </Button>
          </LocalizedLink>
          <LocalizedLink href="/pricing">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <DollarSign className="h-4 w-4" />
              {t.nav.pricing}
            </Button>
          </LocalizedLink>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <BugReportDialog />
          <a
            href="https://github.com/berch-t/kopern"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Github className="h-4 w-4" />
            </Button>
          </a>
          <LocaleSwitcher />
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <LocalizedLink href="/dashboard">
              <Button variant="outline" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                {t.landing.ctaDashboard}
              </Button>
            </LocalizedLink>
          ) : (
            <LocalizedLink href="/login">
              <Button variant="outline">{t.common.signIn}</Button>
            </LocalizedLink>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6">
        {/* Hero */}
        <SlideUp>
          <section className="flex flex-col items-center text-center pt-16 pb-12">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {t.pricing.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {t.pricing.subtitle}
            </p>

            {/* Billing toggle */}
            <div className="mt-8 flex items-center gap-2">
              <Button
                variant={billing === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setBilling("monthly")}
              >
                {t.pricing.monthly}
              </Button>
              <Button
                variant={billing === "annual" ? "default" : "outline"}
                size="sm"
                onClick={() => setBilling("annual")}
                className="gap-2"
              >
                {t.pricing.annual}
                <Badge variant="secondary" className="text-xs">
                  {t.pricing.savePercent}
                </Badge>
              </Button>
            </div>
          </section>
        </SlideUp>

        {/* Pricing cards */}
        <StaggerChildren className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pb-16">
          {tiers.map((tier) => {
            const tierData = t.pricing.tiers[tier.key];
            return (
              <motion.div key={tier.key} variants={staggerItem}>
                <Card
                  className={`relative flex flex-col ${
                    tier.popular ? "ring-2 ring-primary shadow-lg" : ""
                  }`}
                >
                  {tier.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      {t.pricing.popular}
                    </Badge>
                  )}
                  {"payPerUse" in tier && tier.payPerUse && (
                    <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                      <Zap className="h-3 w-3" />
                      {t.pricing.payAsYouGo}
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{tierData.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {tierData.description}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <div className="text-center mb-6">
                      {"payPerUse" in tier && tier.payPerUse ? (
                        <span className="text-2xl font-bold text-primary">
                          {t.pricing.payAsYouGo}
                        </span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold">
                            ${tier.price}
                          </span>
                          {tier.price !== "0" && (
                            <span className="text-muted-foreground">
                              {billing === "monthly" ? t.pricing.mo : t.pricing.yr}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {featureKeys.map((fk) => (
                        <li key={fk} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span>
                            <span className="font-medium">
                              {t.pricing.featureValues[tier.key][fk]}
                            </span>{" "}
                            {t.pricing.features[fk]}
                          </span>
                        </li>
                      ))}
                      {booleanFeatures.map((bf) => (
                        <li key={bf.key} className="flex items-center gap-2 text-sm">
                          {bf[tier.key] ? (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className={!bf[tier.key] ? "text-muted-foreground" : ""}>
                            {t.pricing.features[bf.key]}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <LocalizedLink href={tier.href} className="w-full">
                      <Button
                        className="w-full"
                        variant={tier.popular ? "default" : "outline"}
                      >
                        {tier.cta}
                      </Button>
                    </LocalizedLink>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </StaggerChildren>

        {/* Feature comparison table */}
        <section className="pb-24">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">{t.pricing.comparisonTitle}</h2>
            <p className="text-muted-foreground mt-1">{t.pricing.comparisonSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground" />
                  {tiers.map((tier) => (
                    <th key={tier.key} className="text-center py-3 px-4 font-semibold">
                      {t.pricing.tiers[tier.key].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((fk) => (
                  <tr key={fk} className="border-b">
                    <td className="py-3 px-4 text-muted-foreground">
                      {t.pricing.features[fk]}
                    </td>
                    {tiers.map((tier) => (
                      <td key={tier.key} className="text-center py-3 px-4">
                        {t.pricing.featureValues[tier.key][fk]}
                      </td>
                    ))}
                  </tr>
                ))}
                {booleanFeatures.map((bf) => (
                  <tr key={bf.key} className="border-b">
                    <td className="py-3 px-4 text-muted-foreground">
                      {t.pricing.features[bf.key]}
                    </td>
                    {tiers.map((tier) => (
                      <td key={tier.key} className="text-center py-3 px-4">
                        {bf[tier.key] ? (
                          <Check className="h-4 w-4 text-primary mx-auto" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {t.landing.footer}
      </footer>
    </div>
  );
}
