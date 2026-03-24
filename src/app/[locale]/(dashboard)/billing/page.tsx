"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { useCollection } from "@/hooks/useFirestore";
import { agentsCollection, type AgentDoc } from "@/lib/firebase/firestore";
import { getUsage, getUsageHistory, TOKEN_PRICING, PER_MODEL_PRICING } from "@/actions/billing";
import { KOPERN_COMMISSION_RATE } from "@/lib/stripe/config";
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
  FlaskConical,
  Download,
} from "lucide-react";
import { toCSV, downloadCSV, downloadJSON } from "@/lib/utils/csv-export";

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

  // Group per-model pricing by provider
  const modelsByProvider: { provider: string; color: string; models: { name: string; input: number; output: number }[] }[] = [
    {
      provider: "Anthropic",
      color: "text-orange-500",
      models: Object.entries(PER_MODEL_PRICING)
        .filter(([id]) => id.startsWith("claude-"))
        .map(([, v]) => ({ name: v.name, input: v.input * (1 + KOPERN_COMMISSION_RATE), output: v.output * (1 + KOPERN_COMMISSION_RATE) })),
    },
    {
      provider: "OpenAI",
      color: "text-emerald-500",
      models: Object.entries(PER_MODEL_PRICING)
        .filter(([id]) => id.startsWith("gpt-") || id.startsWith("o3") || id.startsWith("o4"))
        .map(([, v]) => ({ name: v.name, input: v.input * (1 + KOPERN_COMMISSION_RATE), output: v.output * (1 + KOPERN_COMMISSION_RATE) })),
    },
    {
      provider: "Google",
      color: "text-blue-500",
      models: Object.entries(PER_MODEL_PRICING)
        .filter(([id]) => id.startsWith("gemini-"))
        .map(([, v]) => ({ name: v.name, input: v.input * (1 + KOPERN_COMMISSION_RATE), output: v.output * (1 + KOPERN_COMMISSION_RATE) })),
    },
    {
      provider: "Mistral AI",
      color: "text-amber-500",
      models: Object.entries(PER_MODEL_PRICING)
        .filter(([id]) => id.startsWith("mistral-") || id.startsWith("magistral") || id.startsWith("codestral") || id.startsWith("devstral"))
        .map(([, v]) => ({ name: v.name, input: v.input * (1 + KOPERN_COMMISSION_RATE), output: v.output * (1 + KOPERN_COMMISSION_RATE) })),
    },
    {
      provider: "Ollama (Local)",
      color: "text-gray-500",
      models: [{ name: "All local models", input: 0, output: 0 }],
    },
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

  function exportBillingCSV() {
    if (!usage) return;
    const rows = breakdownRows.map((row) => ({
      agent: row.agentName,
      agentId: row.agentId,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      cost: row.cost,
    }));
    // Add summary row
    rows.push({
      agent: "TOTAL",
      agentId: "",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cost: usage.totalCost,
    });
    const columns = [
      { key: "agent", label: "Agent" },
      { key: "agentId", label: "Agent ID" },
      { key: "inputTokens", label: "Input Tokens" },
      { key: "outputTokens", label: "Output Tokens" },
      { key: "cost", label: "Cost (USD)" },
    ];
    const csv = toCSV(rows, columns);
    downloadCSV(csv, `billing-${usage.yearMonth}`);
  }

  function exportBillingJSON() {
    if (!usage) return;
    downloadJSON({
      yearMonth: usage.yearMonth,
      plan: subscription.plan,
      summary: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalCost: usage.totalCost,
        requestCount: usage.requestCount,
        gradingRuns: usage.gradingRuns ?? 0,
      },
      agentBreakdown: breakdownRows,
      history: history.map((h) => ({
        yearMonth: h.yearMonth,
        inputTokens: h.inputTokens,
        outputTokens: h.outputTokens,
        totalCost: h.totalCost,
      })),
    }, `billing-${usage.yearMonth}`);
  }

  const PlanIcon = planIcon[subscription.plan] || Zap;

  return (
    <div className="space-y-8">
      {/* Header */}
      <SlideUp>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CreditCard className="h-8 w-8" />
              {t.billing.title}
            </h1>
            <p className="text-muted-foreground mt-1">{t.billing.subtitle}</p>
          </div>

          {usage && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportBillingCSV} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportBillingJSON} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                JSON
              </Button>
            </div>
          )}
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

          {/* AutoResearch Usage */}
          {usage && (usage.autoresearchIterations ?? 0) > 0 && (
            <FadeIn delay={0.25}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    {t.billing.autoresearchUsage}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">{t.billing.autoresearchIterations}</p>
                      <p className="text-2xl font-bold tabular-nums">{usage.autoresearchIterations ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">{t.billing.autoresearchCost}</p>
                      <p className="text-2xl font-bold tabular-nums">
                        ${((usage.autoresearchIterations ?? 0) * 0.10).toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">{t.billing.autoresearchTokens}</p>
                      <p className="text-2xl font-bold tabular-nums">
                        {formatTokens(usage.inputTokens + usage.outputTokens)}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.billing.includedInTotal}</p>
                    </div>
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

      {/* Token Pricing Info — Per-Model Detail */}
      <FadeIn delay={0.4}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              {t.billing.costEstimate}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">{t.billing.usageCommission}</p>

            {modelsByProvider.map((group) => (
              <div key={group.provider}>
                <h3 className={`text-sm font-semibold mb-2 ${group.color}`}>
                  {group.provider}
                  {group.models[0]?.input === 0 && group.models[0]?.output === 0 && (
                    <Badge variant="secondary" className="text-xs ml-2">Free</Badge>
                  )}
                </h3>
                {group.models[0]?.input === 0 && group.models[0]?.output === 0 ? (
                  <p className="text-xs text-muted-foreground">Local inference — no token costs</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="pb-1.5 text-left font-medium">Model</th>
                          <th className="pb-1.5 text-right font-medium">{t.billing.perMillionInput}</th>
                          <th className="pb-1.5 text-right font-medium">{t.billing.perMillionOutput}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.models.map((model) => (
                          <tr key={model.name} className="border-b last:border-0">
                            <td className="py-1.5 font-medium">{model.name}</td>
                            <td className="py-1.5 text-right tabular-nums font-mono">
                              ${model.input < 0.1 ? model.input.toFixed(3) : model.input.toFixed(2)}
                            </td>
                            <td className="py-1.5 text-right tabular-nums font-mono">
                              ${model.output < 0.1 ? model.output.toFixed(3) : model.output.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
