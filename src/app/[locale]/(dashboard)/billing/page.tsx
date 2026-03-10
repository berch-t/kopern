"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { useCollection } from "@/hooks/useFirestore";
import { agentsCollection, type AgentDoc } from "@/lib/firebase/firestore";
import { getUsage, getUsageHistory, TOKEN_PRICING } from "@/actions/billing";
import type { UsageDoc } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { UsageBarChart } from "@/components/observability/UsageBarChart";
import { LocalizedLink } from "@/components/LocalizedLink";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  Activity,
  CreditCard,
  Info,
  ExternalLink,
  Crown,
  Zap,
  Shield,
  AlertTriangle,
} from "lucide-react";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function BillingPage() {
  const { user } = useAuth();
  const t = useDictionary();
  const locale = useLocale();
  const { subscription, loading: subLoading, isPaid, openPortal } = useSubscription();
  const { data: agents } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );

  const [usage, setUsage] = useState<(UsageDoc & { yearMonth: string }) | null>(null);
  const [history, setHistory] = useState<(UsageDoc & { yearMonth: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadUsage() {
      try {
        const [currentUsage, usageHistory] = await Promise.all([
          getUsage(user!.uid).catch(() => null),
          getUsageHistory(user!.uid, 6).catch(() => []),
        ]);
        setUsage(currentUsage);
        setHistory(usageHistory);
      } catch {
        setUsage(null);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }

    loadUsage();
  }, [user]);

  // Agent name lookup
  const agentNameMap: Record<string, string> = {};
  for (const agent of agents) {
    agentNameMap[agent.id] = agent.name;
  }

  // Breakdown rows
  const breakdownRows: { agentId: string; agentName: string; inputTokens: number; outputTokens: number; cost: number }[] = [];
  if (usage) {
    if (usage.agentBreakdown && typeof usage.agentBreakdown === "object") {
      for (const [id, data] of Object.entries(usage.agentBreakdown)) {
        breakdownRows.push({
          agentId: id,
          agentName: agentNameMap[id] ?? id.slice(0, 8) + "...",
          ...(data as { inputTokens: number; outputTokens: number; cost: number }),
        });
      }
    }
  }

  // Chart data
  const historyData = history.map((h) => ({
    yearMonth: h.yearMonth,
    totalCost: h.totalCost ?? 0,
    inputTokens: h.inputTokens ?? 0,
    outputTokens: h.outputTokens ?? 0,
  }));
  const chartData =
    historyData.length === 0 && usage
      ? [{ yearMonth: usage.yearMonth, totalCost: usage.totalCost ?? 0, inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 }]
      : historyData;

  const providerPricing = [
    { name: "Anthropic", input: TOKEN_PRICING.anthropic.input, output: TOKEN_PRICING.anthropic.output, color: "text-orange-500" },
    { name: "OpenAI", input: TOKEN_PRICING.openai.input, output: TOKEN_PRICING.openai.output, color: "text-emerald-500" },
    { name: "Google", input: TOKEN_PRICING.google.input, output: TOKEN_PRICING.google.output, color: "text-blue-500" },
    { name: "Ollama", input: TOKEN_PRICING.ollama.input, output: TOKEN_PRICING.ollama.output, color: "text-gray-500" },
  ];

  // Plan display
  const planLabel: Record<string, string> = {
    starter: t.billing.planStarter,
    pro: t.billing.planPro,
    usage: t.billing.planUsage,
    enterprise: t.billing.planEnterprise,
  };

  const planIcon: Record<string, typeof Crown> = {
    starter: Zap,
    pro: Crown,
    usage: Activity,
    enterprise: Shield,
  };

  if (loading || subLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const PlanIcon = planIcon[subscription.plan] || Zap;

  return (
    <div className="space-y-8">
      {/* Header */}
      <SlideUp>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-8 w-8" />
            {t.billing.title}
          </h1>
          <p className="text-muted-foreground mt-1">{t.billing.subtitle}</p>
        </div>
      </SlideUp>

      {/* Subscription Card */}
      <FadeIn delay={0.05}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <PlanIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{t.billing.currentPlan}</h2>
                    <Badge
                      variant={subscription.status === "active" || subscription.status === "trialing" ? "default" : "destructive"}
                    >
                      {subscription.status === "active" || subscription.status === "trialing"
                        ? t.billing.planActive
                        : subscription.status === "past_due"
                          ? t.billing.planPastDue
                          : t.billing.planCanceled}
                    </Badge>
                  </div>
                  <p className="text-xl font-bold mt-0.5">{planLabel[subscription.plan]}</p>
                  {subscription.currentPeriodEnd && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {subscription.cancelAtPeriodEnd ? t.billing.cancelsOn : t.billing.renewsOn}{" "}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPaid ? (
                  <Button variant="outline" onClick={() => openPortal(locale)} className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {t.billing.managePlan}
                  </Button>
                ) : (
                  <LocalizedLink href="/pricing">
                    <Button className="gap-2">
                      <Crown className="h-4 w-4" />
                      {t.billing.upgradePlan}
                    </Button>
                  </LocalizedLink>
                )}
              </div>
            </div>

            {subscription.status === "past_due" && (
              <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t.billing.planPastDue}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {!usage ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <DollarSign className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-lg font-medium">{t.billing.noUsage}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.billing.noUsageDesc}</p>
          </div>
        </SlideUp>
      ) : (
        <>
          {/* Stat cards */}
          <FadeIn delay={0.1}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <ArrowDownToLine className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.billing.inputTokens}</p>
                    <p className="text-2xl font-bold tabular-nums">
                      <AnimatedCounter value={usage.inputTokens} />
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <ArrowUpFromLine className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.billing.outputTokens}</p>
                    <p className="text-2xl font-bold tabular-nums">
                      <AnimatedCounter value={usage.outputTokens} />
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.billing.totalCost}</p>
                    <p className="text-2xl font-bold tabular-nums">
                      $<AnimatedCounter value={usage.totalCost} decimals={2} />
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <Activity className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.billing.requests}</p>
                    <p className="text-2xl font-bold tabular-nums">
                      <AnimatedCounter value={usage.requestCount} />
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </FadeIn>

          {/* Per-Agent Breakdown */}
          {breakdownRows.length > 0 && (
            <FadeIn delay={0.2}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.billing.agentBreakdown}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Agent</th>
                          <th className="pb-2 font-medium text-right">{t.billing.inputTokens}</th>
                          <th className="pb-2 font-medium text-right">{t.billing.outputTokens}</th>
                          <th className="pb-2 font-medium text-right">{t.billing.totalCost}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdownRows.map((row) => (
                          <tr key={row.agentId} className="border-b last:border-0">
                            <td className="py-2.5 font-medium">{row.agentName}</td>
                            <td className="py-2.5 text-right tabular-nums">{formatTokens(row.inputTokens)}</td>
                            <td className="py-2.5 text-right tabular-nums">{formatTokens(row.outputTokens)}</td>
                            <td className="py-2.5 text-right tabular-nums">${row.cost.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* Usage History */}
          {chartData.length > 0 && (
            <FadeIn delay={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.billing.usageHistory}</CardTitle>
                </CardHeader>
                <CardContent>
                  <UsageBarChart data={chartData} />
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </>
      )}

      {/* Token Pricing Info */}
      <FadeIn delay={0.4}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              {t.billing.costEstimate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{t.billing.usageCommission}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {providerPricing.map((provider) => (
                <div key={provider.name} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${provider.color}`}>{provider.name}</span>
                    {provider.input === 0 && provider.output === 0 && (
                      <Badge variant="secondary" className="text-xs">Free</Badge>
                    )}
                  </div>
                  {provider.input > 0 || provider.output > 0 ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        <span className="font-mono font-medium text-foreground">${provider.input.toFixed(2)}</span>{" "}
                        {t.billing.perMillionInput}
                      </p>
                      <p>
                        <span className="font-mono font-medium text-foreground">${provider.output.toFixed(2)}</span>{" "}
                        {t.billing.perMillionOutput}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Local inference — no token costs</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
