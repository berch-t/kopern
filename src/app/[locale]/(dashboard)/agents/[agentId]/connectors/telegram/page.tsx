"use client";

import { use } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { agentDoc, type AgentDoc } from "@/lib/firebase/firestore";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { useLocale } from "@/providers/LocaleProvider";
import { TelegramConnector } from "@/components/connectors/TelegramConnector";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { connectorTutorials } from "@/data/connector-tutorials";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/FadeIn";

export default function TelegramConnectorPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: agent } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null,
  );
  const router = useLocalizedRouter();
  const locale = useLocale();

  if (!user || !agent) return null;

  const tutorial = locale === "fr" ? connectorTutorials.fr.telegram : connectorTutorials.en.telegram;

  return (
    <div className="space-y-8">
      <TelegramConnector
        agentId={agentId}
        onBack={() => router.push(`/agents/${agentId}/connectors`)}
      />

      <FadeIn delay={0.2}>
        <Card>
          <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer content={tutorial} />
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
