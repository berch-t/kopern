"use client";

import { use, useState } from "react";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { agentDoc, widgetConfigDoc, slackConnectionDoc, type AgentDoc, type WidgetConfigDoc, type SlackConnectionDoc } from "@/lib/firebase/firestore";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { ConnectorCard } from "@/components/connectors/ConnectorCard";
import { WidgetConfigurator } from "@/components/connectors/WidgetConfigurator";
import { WebhookManager } from "@/components/connectors/WebhookManager";
import { SlackConnector } from "@/components/connectors/SlackConnector";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { connectorTutorials } from "@/data/connector-tutorials";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Webhook, MessageCircle, X } from "lucide-react";

type ActivePanel = "widget" | "webhooks" | "slack" | null;
type ActiveTutorial = "widget" | "webhooks" | "slack" | null;

export default function ConnectorsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const locale = useLocale();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [activeTutorial, setActiveTutorial] = useState<ActiveTutorial>(null);

  const { data: agent, loading } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null
  );

  const { data: widgetConfig } = useDocument<WidgetConfigDoc>(
    user ? widgetConfigDoc(user.uid, agentId) : null
  );

  const { data: slackConnection } = useDocument<SlackConnectionDoc>(
    user ? slackConnectionDoc(user.uid, agentId) : null
  );

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">{t.common.loading}</div>;
  }

  if (!agent || !user) {
    return <div className="text-destructive">{t.agents.detail.notFound}</div>;
  }

  if (activePanel === "widget") {
    return (
      <WidgetConfigurator
        agentId={agentId}
        agentName={agent.name}
        onBack={() => setActivePanel(null)}
      />
    );
  }

  if (activePanel === "webhooks") {
    return (
      <WebhookManager
        agentId={agentId}
        apiKeyPrefix={widgetConfig?.apiKeyPlain || widgetConfig?.apiKeyPrefix}
        onBack={() => setActivePanel(null)}
      />
    );
  }

  if (activePanel === "slack") {
    return (
      <SlackConnector
        agentId={agentId}
        onBack={() => setActivePanel(null)}
      />
    );
  }

  const toggleTutorial = (key: ActiveTutorial) => {
    setActiveTutorial((prev) => (prev === key ? null : key));
  };

  const tutorials = locale === "fr" ? connectorTutorials.fr : connectorTutorials.en;

  return (
    <div className="space-y-6">
      <SlideUp>
        <div>
          <h1 className="text-3xl font-bold">{t.connectors.title}</h1>
          <p className="mt-1 text-muted-foreground">{t.connectors.subtitle}</p>
        </div>
      </SlideUp>

      <FadeIn delay={0.1}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ConnectorCard
            icon={MessageSquare}
            title={t.connectors.widget.title}
            description={t.connectors.widget.description}
            enabled={widgetConfig?.enabled}
            statusLabel={widgetConfig ? (widgetConfig.enabled ? t.connectors.widget.enabled : t.connectors.widget.disabled) : undefined}
            accent="text-blue-500"
            bg="bg-blue-500/10"
            actionLabel={t.connectors.widget.configure}
            onAction={() => setActivePanel("widget")}
            tutorialLabel={t.connectors.tutorial}
            tutorialActive={activeTutorial === "widget"}
            onTutorial={() => toggleTutorial("widget")}
          />

          <ConnectorCard
            icon={Webhook}
            title={t.connectors.webhooks.title}
            description={t.connectors.webhooks.description}
            accent="text-amber-500"
            bg="bg-amber-500/10"
            actionLabel={t.connectors.webhooks.create}
            onAction={() => setActivePanel("webhooks")}
            tutorialLabel={t.connectors.tutorial}
            tutorialActive={activeTutorial === "webhooks"}
            onTutorial={() => toggleTutorial("webhooks")}
          />

          <ConnectorCard
            icon={MessageCircle}
            title={t.connectors.slack.title}
            description={t.connectors.slack.description}
            enabled={slackConnection?.enabled}
            statusLabel={slackConnection?.enabled ? t.connectors.slack.connected : undefined}
            accent="text-purple-500"
            bg="bg-purple-500/10"
            actionLabel={slackConnection ? t.connectors.slack.reconnect : t.connectors.slack.connect}
            onAction={() => setActivePanel("slack")}
            tutorialLabel={t.connectors.tutorial}
            tutorialActive={activeTutorial === "slack"}
            onTutorial={() => toggleTutorial("slack")}
          />
        </div>
      </FadeIn>

      {/* Tutorial section — expands below the cards */}
      {activeTutorial && (
        <FadeIn>
          <Card className="border-primary/20">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeTutorial === "widget" && <MessageSquare className="h-5 w-5 text-blue-500" />}
                  {activeTutorial === "webhooks" && <Webhook className="h-5 w-5 text-amber-500" />}
                  {activeTutorial === "slack" && <MessageCircle className="h-5 w-5 text-purple-500" />}
                  <h2 className="text-lg font-semibold">
                    {t.connectors.tutorial} — {
                      activeTutorial === "widget" ? t.connectors.widget.title :
                      activeTutorial === "webhooks" ? t.connectors.webhooks.title :
                      t.connectors.slack.title
                    }
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTutorial(null)}
                  className="text-muted-foreground"
                >
                  <X className="mr-1 h-4 w-4" />
                  {t.connectors.closeTutorial}
                </Button>
              </div>
              <MarkdownRenderer
                content={tutorials[activeTutorial]}
                headingIds
              />
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
