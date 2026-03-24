"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { telegramConnectorDoc, type TelegramConnectorDoc } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SlideUp } from "@/components/motion/SlideUp";
import { ArrowLeft, Send, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface TelegramConnectorProps {
  agentId: string;
  onBack: () => void;
}

export function TelegramConnector({ agentId, onBack }: TelegramConnectorProps) {
  const { user } = useAuth();
  const t = useDictionary();
  const [botToken, setBotToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const docRef = user ? telegramConnectorDoc(user.uid, agentId) : null;
  const { data: connection, loading } = useDocument<TelegramConnectorDoc>(docRef);

  const handleConnect = async () => {
    if (!user || !botToken.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: botToken.trim(), userId: user.uid, agentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      toast.success(t.connectors.telegram.toastConnected);
      setBotToken("");
    } catch (err) {
      toast.error(`${t.connectors.telegram.toastConnectError}: ${(err as Error).message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    const confirmed = window.confirm(t.connectors.telegram.confirmDisconnect);
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      const res = await fetch("/api/telegram/setup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, agentId }),
      });
      if (!res.ok) throw new Error("Disconnect failed");
      toast.success(t.connectors.telegram.toastDisconnected);
    } catch {
      toast.error(t.connectors.telegram.toastDisconnectError);
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
              <Send className="h-4 w-4 text-sky-500" />
            </div>
            <h2 className="text-lg font-semibold">{t.connectors.telegram.title}</h2>
          </div>
        </div>

        {!connection ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.connectors.telegram.connect}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.connectors.telegram.description}
              </p>

              <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">{t.connectors.telegram.howItWorks}</p>
                <ol className="list-inside list-decimal space-y-1">
                  <li>{t.connectors.telegram.step1}</li>
                  <li>{t.connectors.telegram.step2}</li>
                  <li>{t.connectors.telegram.step3}</li>
                  <li>{t.connectors.telegram.step4}</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label>{t.connectors.telegram.botToken}</Label>
                <Input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder={t.connectors.telegram.botTokenPlaceholder}
                />
              </div>

              <Button onClick={handleConnect} disabled={connecting || !botToken.trim()} className="w-full gap-2">
                <Send className="h-4 w-4" />
                {connecting ? t.common.loading : t.connectors.telegram.connect}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.connectors.telegram.botUsername}</CardTitle>
                <Badge variant={connection.enabled ? "default" : "secondary"}>
                  {connection.enabled ? t.connectors.telegram.connected : t.common.disabled}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.connectors.telegram.botUsername}</span>
                  <a
                    href={`https://t.me/${connection.botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    @{connection.botUsername}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {disconnecting ? t.common.loading : t.connectors.telegram.disconnect}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </SlideUp>
  );
}
