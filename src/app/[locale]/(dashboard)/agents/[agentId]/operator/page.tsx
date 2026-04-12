"use client";

import { use, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { agentDoc, widgetConfigDoc, slackConnectionDoc, telegramConnectorDoc, whatsappConnectorDoc, type AgentDoc, type WidgetConfigDoc, type SlackConnectionDoc, type TelegramConnectorDoc, type WhatsAppConnectorDoc } from "@/lib/firebase/firestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";
import {
  getOperatorKPIs,
  getRecentConversations,
  type OperatorKPIs,
  type ConversationSummary,
} from "@/actions/operator";
import AutoFixButton from "@/components/operator/AutoFixButton";
import OperatorEditForm from "@/components/operator/OperatorEditForm";
import MemoryPanel from "@/components/operator/MemoryPanel";
import { ServiceConnectorPanel } from "@/components/operator/ServiceConnectorPanel";
import { SocialConnectorPanel } from "@/components/operator/SocialConnectorPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  CheckCircle2,
  Smile,
  Euro,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  Settings2,
  Globe,
  Plug,
} from "lucide-react";

const SOURCE_COLORS: Record<string, string> = {
  playground: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  widget: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  webhook: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  slack: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  mcp: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  grading: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  autoresearch: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  pipeline: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  team: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  telegram: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  whatsapp: "bg-green-500/10 text-green-700 dark:text-green-400",
};

const SOURCE_LABELS: Record<string, string> = {
  playground: "Playground",
  widget: "Widget",
  webhook: "Webhook",
  slack: "Slack",
  mcp: "MCP",
  pipeline: "Pipeline",
  team: "Team",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
};

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "maintenant";
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function OperatorPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: agent } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null,
  );
  const { data: widgetConfig } = useDocument<WidgetConfigDoc>(
    user ? widgetConfigDoc(user.uid, agentId) : null,
  );
  const { data: slackConn } = useDocument<SlackConnectionDoc>(
    user ? slackConnectionDoc(user.uid, agentId) : null,
  );
  const { data: telegramConn } = useDocument<TelegramConnectorDoc>(
    user ? telegramConnectorDoc(user.uid, agentId) : null,
  );
  const { data: whatsappConn } = useDocument<WhatsAppConnectorDoc>(
    user ? whatsappConnectorDoc(user.uid, agentId) : null,
  );
  const t = useDictionary();

  const connectors = [
    { key: "widget", href: `/agents/${agentId}/connectors/widget`, label: "Widget", active: widgetConfig?.enabled, bg: "bg-blue-500/10", svg: <Globe className="h-7 w-7 text-blue-500" /> },
    { key: "telegram", href: `/agents/${agentId}/connectors/telegram`, label: "Telegram", active: telegramConn?.enabled, bg: "bg-[#26A5E4]/10", svg: <svg className="h-7 w-7" viewBox="0 0 240 240" fill="#26A5E4"><path d="M66.964 134.874s-32.08-10.062-51.344-16.002c-17.542-6.693-1.57-14.028 6.015-17.59 7.585-3.563 155.993-61.986 155.993-61.986s17.16-6.96 12.04 9.472c-1.78 6.96-16.174 62.58-30.5 115.988 0 0-2.72 11.2-24.942 1.138 0 0-39.2-26.4-47.174-32.38-3.585-2.96-8.4-9.472 1.78-17.59 0 0 40.22-37.422 52.262-49.142 4.535-5.325-1.78-8.4-7.59-3.52-16.174 12.8-43.538 30.398-53.59 36.94-10.05 6.54-20.32 3.96-20.32 3.96l-33.63-10.288z"/></svg> },
    { key: "whatsapp", href: `/agents/${agentId}/connectors/whatsapp`, label: "WhatsApp", active: whatsappConn?.enabled, bg: "bg-[#25D366]/10", svg: <svg className="h-7 w-7" viewBox="0 0 24 24" fill="#25D366"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.27.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.188 8.188 0 0 1-1.26-4.38c.01-4.54 3.7-8.24 8.25-8.25M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.86-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.27-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.39.11-.5.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43-.14 0-.3-.01-.47-.01"/></svg> },
    { key: "slack", href: `/agents/${agentId}/connectors/slack`, label: "Slack", active: slackConn?.enabled, bg: "bg-[#4A154B]/10", svg: <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/><path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/><path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/><path d="M15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" fill="#ECB22E"/></svg> },
  ];
  const hasAnyConnector = connectors.some((c) => c.active);

  const [kpis, setKpis] = useState<OperatorKPIs | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const [kpiData, convData] = await Promise.all([
        getOperatorKPIs(user!.uid, agentId),
        getRecentConversations(user!.uid, agentId),
      ]);
      if (cancelled) return;
      setKpis(kpiData);
      setConversations(convData);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user, agentId]);

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{agent?.name ?? "..."}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t.operator.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <AutoFixButton userId={user.uid} agentId={agentId} />
            <LocalizedLink href={`/agents/${agentId}`}>
              <Button variant="ghost" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                {t.operator.expertMode}
              </Button>
            </LocalizedLink>
          </div>
        </div>
      </SlideUp>

      {/* KPI Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Messages */}
            <KPICard
              icon={MessageSquare}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
              label={t.operator.messagesThisMonth}
              value={kpis?.messagesThisMonth ?? 0}
              trend={kpis?.messageTrend ?? null}
              trendNew={t.operator.trendNew}
            />

            {/* Resolution rate */}
            <KPICard
              icon={CheckCircle2}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
              label={t.operator.resolutionRate}
              value={kpis?.resolutionRate ?? 0}
              suffix="%"
              trend={null}
              trendNew={kpis?.resolutionRate === null ? t.operator.trendNew : undefined}
            />

            {/* Satisfaction */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <Smile className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t.operator.avgSatisfaction}</p>
                    <p className="text-2xl font-bold">—</p>
                  </div>
                </div>
                <Badge variant="outline" className="mt-3 text-[10px]">{t.operator.comingSoon}</Badge>
              </CardContent>
            </Card>

            {/* Cost */}
            <KPICard
              icon={Euro}
              iconColor="text-violet-500"
              iconBg="bg-violet-500/10"
              label={t.operator.monthlyCost}
              value={kpis?.monthlyCostEUR ?? 0}
              decimals={2}
              suffix="€"
              trend={kpis?.costTrend ?? null}
              trendNew={t.operator.trendNew}
            />
          </div>
        </FadeIn>
      )}

      {/* Connector Status */}
      <FadeIn>
        <Card className={!hasAnyConnector ? "border-amber-500/50 bg-amber-500/5" : undefined}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plug className={`h-4 w-4 ${hasAnyConnector ? "text-muted-foreground" : "text-amber-500"}`} />
                <h3 className="font-semibold text-sm">
                  {hasAnyConnector ? t.operator.connectors.title : t.operator.connectors.notConnected}
                </h3>
              </div>
              <LocalizedLink href={`/agents/${agentId}/connectors`}>
                <Button variant="outline" size="sm">
                  {t.operator.connectors.configure}
                </Button>
              </LocalizedLink>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {connectors.map((c) => (
                <LocalizedLink key={c.key} href={c.href}>
                  <div className={`flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${c.active ? "border-green-500/30 bg-green-500/5" : ""}`}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                      {c.svg}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{c.label}</p>
                      <p className={`text-[10px] ${c.active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {c.active ? t.operator.connectors.active : t.operator.connectors.inactive}
                      </p>
                    </div>
                  </div>
                </LocalizedLink>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Edit Form (template-based agents only) */}
      {agent && <OperatorEditForm agentId={agentId} agent={agent} />}

      {/* Agent Memory */}
      {agent && <MemoryPanel agentId={agentId} memoryConfig={agent.memoryConfig} builtinTools={agent.builtinTools} />}

      {/* Service Connectors (Email/Calendar) */}
      {agent && (
        <ServiceConnectorPanel
          agentId={agentId}
          hasEmailTool={agent.builtinTools?.includes("service_email") ?? false}
          hasCalendarTool={agent.builtinTools?.includes("service_calendar") ?? false}
        />
      )}

      {/* Social Media Connectors (Bluesky, Twitter, LinkedIn, Facebook) */}
      {agent && (
        <SocialConnectorPanel
          agentId={agentId}
          hasSocialMedia={agent.builtinTools?.includes("service_social_media") ?? false}
        />
      )}

      {/* Recent Conversations */}
      <SlideUp delay={0.2}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.operator.conversations.title}</h2>
            <LocalizedLink
              href={`/agents/${agentId}/sessions`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              {t.operator.conversations.viewAll}
              <ArrowRight className="h-3.5 w-3.5" />
            </LocalizedLink>
          </div>

          {conversations.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>{t.operator.conversations.empty}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                {/* Table header */}
                <div className="grid grid-cols-[auto_1fr_80px] md:grid-cols-[auto_1fr_72px_64px_56px_72px_64px_80px] items-center gap-x-3 px-4 py-2 border-b text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  <span className="w-2" />
                  <span>Conversation</span>
                  <span className="hidden md:block text-right">Source</span>
                  <span className="hidden md:block text-right">Msgs</span>
                  <span className="hidden md:block text-right">Tools</span>
                  <span className="hidden md:block text-right">Tokens</span>
                  <span className="hidden md:block text-right">Cost</span>
                  <span className="text-right">Date</span>
                </div>
                <StaggerChildren>
                  <div className="divide-y">
                    {conversations.map((conv) => (
                      <motion.div key={conv.id} variants={staggerItem}>
                        <LocalizedLink href={`/agents/${agentId}/sessions/${conv.id}`}>
                          <div className="grid grid-cols-[auto_1fr_80px] md:grid-cols-[auto_1fr_72px_64px_56px_72px_64px_80px] items-center gap-x-3 px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer">
                            {/* Resolved indicator */}
                            <div className={`h-2 w-2 shrink-0 rounded-full ${conv.resolved ? "bg-emerald-500" : "bg-amber-500"}`} />

                            {/* Message */}
                            <p className="text-sm truncate min-w-0">
                              {conv.firstMessage}
                            </p>

                            {/* Source */}
                            <div className="hidden md:block text-right">
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[conv.source] ?? "bg-gray-500/10 text-gray-500"}`}>
                                {SOURCE_LABELS[conv.source] ?? conv.source ?? "—"}
                              </span>
                            </div>

                            {/* Messages count */}
                            <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
                              {conv.messageCount}
                            </span>

                            {/* Tool calls */}
                            <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
                              {conv.toolCallCount || "—"}
                            </span>

                            {/* Tokens */}
                            <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
                              {conv.totalTokens > 0 ? conv.totalTokens >= 1000 ? `${(conv.totalTokens / 1000).toFixed(1)}k` : conv.totalTokens : "—"}
                            </span>

                            {/* Cost */}
                            <span className="hidden md:block text-xs text-muted-foreground text-right tabular-nums">
                              {conv.costEUR > 0 ? `${conv.costEUR.toFixed(3)}€` : "—"}
                            </span>

                            {/* Date */}
                            <span className="text-xs text-muted-foreground text-right whitespace-nowrap">
                              {formatRelativeDate(conv.startedAt)}
                            </span>
                          </div>
                        </LocalizedLink>
                      </motion.div>
                    ))}
                  </div>
                </StaggerChildren>
              </CardContent>
            </Card>
          )}
        </div>
      </SlideUp>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card component
// ---------------------------------------------------------------------------

function KPICard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  decimals = 0,
  suffix = "",
  trend,
  trendNew,
}: {
  icon: typeof MessageSquare;
  iconColor: string;
  iconBg: string;
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  trend: number | null;
  trendNew?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-1">
              <AnimatedCounter value={value} decimals={decimals} suffix={suffix} className="text-2xl font-bold" />
            </div>
          </div>
        </div>
        {/* Trend badge */}
        <div className="mt-3">
          {trend !== null && trend !== undefined ? (
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend >= 0 ? "+" : ""}{trend}%
            </span>
          ) : trendNew ? (
            <Badge variant="outline" className="text-[10px]">{trendNew}</Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
