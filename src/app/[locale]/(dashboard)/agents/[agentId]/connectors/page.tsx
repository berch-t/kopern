"use client";

import { use, useState } from "react";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { agentDoc, widgetConfigDoc, slackConnectionDoc, telegramConnectorDoc, whatsappConnectorDoc, type AgentDoc, type WidgetConfigDoc, type SlackConnectionDoc, type TelegramConnectorDoc, type WhatsAppConnectorDoc } from "@/lib/firebase/firestore";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { ConnectorCard } from "@/components/connectors/ConnectorCard";
import { WidgetConfigurator } from "@/components/connectors/WidgetConfigurator";
import { WebhookManager } from "@/components/connectors/WebhookManager";
import { SlackConnector } from "@/components/connectors/SlackConnector";
import { TelegramConnector } from "@/components/connectors/TelegramConnector";
import { WhatsAppConnector } from "@/components/connectors/WhatsAppConnector";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { connectorTutorials } from "@/data/connector-tutorials";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Webhook, MessageCircle, Send, Phone, X } from "lucide-react";

type ActivePanel = "widget" | "webhooks" | "slack" | "telegram" | "whatsapp" | null;
type ActiveTutorial = "widget" | "webhooks" | "slack" | "telegram" | "whatsapp" | null;

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

  const { data: telegramConnection } = useDocument<TelegramConnectorDoc>(
    user ? telegramConnectorDoc(user.uid, agentId) : null
  );

  const { data: whatsappConnection } = useDocument<WhatsAppConnectorDoc>(
    user ? whatsappConnectorDoc(user.uid, agentId) : null
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

  if (activePanel === "telegram") {
    return (
      <TelegramConnector
        agentId={agentId}
        onBack={() => setActivePanel(null)}
      />
    );
  }

  if (activePanel === "whatsapp") {
    return (
      <WhatsAppConnector
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
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
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

          <ConnectorCard
            icon={Send}
            title={t.connectors.telegram.title}
            description={t.connectors.telegram.description}
            enabled={telegramConnection?.enabled}
            statusLabel={telegramConnection?.enabled ? t.connectors.telegram.connected : undefined}
            accent="text-sky-500"
            bg="bg-sky-500/10"
            actionLabel={telegramConnection ? t.connectors.telegram.disconnect : t.connectors.telegram.connect}
            onAction={() => setActivePanel("telegram")}
            tutorialLabel={t.connectors.tutorial}
            tutorialActive={activeTutorial === "telegram"}
            onTutorial={() => toggleTutorial("telegram")}
          />

          <ConnectorCard
            icon={Phone}
            title={t.connectors.whatsapp.title}
            description={t.connectors.whatsapp.description}
            enabled={whatsappConnection?.enabled}
            statusLabel={whatsappConnection?.enabled ? t.connectors.whatsapp.connected : undefined}
            accent="text-green-500"
            bg="bg-green-500/10"
            actionLabel={whatsappConnection ? t.connectors.whatsapp.disconnect : t.connectors.whatsapp.connect}
            onAction={() => setActivePanel("whatsapp")}
            tutorialLabel={t.connectors.tutorial}
            tutorialActive={activeTutorial === "whatsapp"}
            onTutorial={() => toggleTutorial("whatsapp")}
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
                  {activeTutorial === "telegram" && <Send className="h-5 w-5 text-sky-500" />}
                  {activeTutorial === "whatsapp" && <Phone className="h-5 w-5 text-green-500" />}
                  <h2 className="text-lg font-semibold">
                    {t.connectors.tutorial} — {
                      activeTutorial === "widget" ? t.connectors.widget.title :
                      activeTutorial === "webhooks" ? t.connectors.webhooks.title :
                      activeTutorial === "telegram" ? t.connectors.telegram.title :
                      activeTutorial === "whatsapp" ? t.connectors.whatsapp.title :
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
