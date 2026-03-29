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
  Send,
  Phone,
  MessageCircle,
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
    { key: "widget", href: `/agents/${agentId}/connectors/widget`, icon: Globe, label: "Widget", active: widgetConfig?.enabled, color: "text-blue-500", bg: "bg-blue-500/10" },
    { key: "telegram", href: `/agents/${agentId}/connectors/telegram`, icon: Send, label: "Telegram", active: telegramConn?.enabled, color: "text-sky-500", bg: "bg-sky-500/10" },
    { key: "whatsapp", href: `/agents/${agentId}/connectors/whatsapp`, icon: Phone, label: "WhatsApp", active: whatsappConn?.enabled, color: "text-green-500", bg: "bg-green-500/10" },
    { key: "slack", href: `/agents/${agentId}/connectors/slack`, icon: MessageCircle, label: "Slack", active: slackConn?.enabled, color: "text-purple-500", bg: "bg-purple-500/10" },
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
    <div className="max-w-5xl mx-auto space-y-8">
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
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${c.bg}`}>
                      <c.icon className={`h-4 w-4 ${c.color}`} />
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

      {/* KPI Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <StaggerChildren>
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <motion.div key={conv.id} variants={staggerItem}>
                    <LocalizedLink href={`/agents/${agentId}/sessions/${conv.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* Resolved indicator */}
                            <div className={`h-2 w-2 shrink-0 rounded-full ${conv.resolved ? "bg-emerald-500" : "bg-amber-500"}`} />

                            {/* Message */}
                            <p className="text-sm truncate flex-1 min-w-0">
                              {conv.firstMessage}
                            </p>

                            {/* Meta */}
                            <div className="flex items-center gap-2 shrink-0">
                              {conv.source && conv.source !== "playground" && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[conv.source] ?? "bg-gray-500/10 text-gray-500"}`}>
                                  {SOURCE_LABELS[conv.source] ?? conv.source}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {conv.messageCount} msg
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatRelativeDate(conv.startedAt)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </LocalizedLink>
                  </motion.div>
                ))}
              </div>
            </StaggerChildren>
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
