"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { slackConnectionDoc, type SlackConnectionDoc } from "@/lib/firebase/firestore";
import { deleteSlackConnection } from "@/actions/connectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideUp } from "@/components/motion/SlideUp";
import { ArrowLeft, MessageCircle, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SlackConnectorProps {
  agentId: string;
  onBack: () => void;
}

export function SlackConnector({ agentId, onBack }: SlackConnectorProps) {
  const { user } = useAuth();
  const t = useDictionary();
  const [disconnecting, setDisconnecting] = useState(false);

  const docRef = user ? slackConnectionDoc(user.uid, agentId) : null;
  const { data: connection, loading } = useDocument<SlackConnectionDoc>(docRef);

  const handleConnect = () => {
    if (!user) return;
    window.location.href = `/api/slack/install?userId=${user.uid}&agentId=${agentId}`;
  };

  const handleDisconnect = async () => {
    if (!user || !connection) return;
    const confirmed = window.confirm(t.connectors.slack.confirmDisconnect);
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      await deleteSlackConnection(user.uid, agentId);
      toast.success(t.connectors.slack.toastDisconnected);
    } catch {
      toast.error(t.connectors.slack.toastDisconnectError);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <SlideUp>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <MessageCircle className="h-4 w-4 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold">{t.connectors.slack.title}</h2>
          </div>
        </div>

        {!connection ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.connectors.slack.connect}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.connectors.slack.description}
              </p>
              <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">{t.connectors.slack.howItWorks}</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>{t.connectors.slack.tipMention}</li>
                  <li>{t.connectors.slack.tipDm}</li>
                  <li>{t.connectors.slack.tipThreads}</li>
                </ul>
              </div>
              <Button onClick={handleConnect} className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                {t.connectors.slack.connect}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.connectors.slack.workspace}</CardTitle>
                <Badge variant={connection.enabled ? "default" : "secondary"}>
                  {connection.enabled ? t.connectors.slack.connected : t.common.disabled}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.connectors.slack.workspace}</span>
                  <span className="text-sm font-medium">{connection.teamName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.connectors.slack.teamId}</span>
                  <span className="font-mono text-xs text-muted-foreground">{connection.teamId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.connectors.slack.installedBy}</span>
                  <span className="font-mono text-xs text-muted-foreground">{connection.installedBy}</span>
                </div>
                {connection.channels.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t.connectors.slack.channels}</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {connection.channels.map((channel) => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          #{channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {disconnecting ? t.common.loading : t.connectors.slack.disconnect}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </SlideUp>
  );
}
