"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { whatsappConnectorDoc, type WhatsAppConnectorDoc } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SlideUp } from "@/components/motion/SlideUp";
import { ArrowLeft, Phone, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.ai";

interface WhatsAppConnectorProps {
  agentId: string;
  onBack: () => void;
}

export function WhatsAppConnector({ agentId, onBack }: WhatsAppConnectorProps) {
  const { user } = useAuth();
  const t = useDictionary();
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const docRef = user ? whatsappConnectorDoc(user.uid, agentId) : null;
  const { data: connection, loading } = useDocument<WhatsAppConnectorDoc>(docRef);

  const webhookUrl = `${SITE_URL}/api/whatsapp/webhook`;

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success(t.common.copied);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async () => {
    if (!user || !phoneNumberId.trim() || !accessToken.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/whatsapp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: phoneNumberId.trim(),
          accessToken: accessToken.trim(),
          verifyToken: verifyToken.trim(),
          phoneNumber: phoneNumber.trim(),
          userId: user.uid,
          agentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      toast.success(t.connectors.whatsapp.toastConnected);
      setPhoneNumberId("");
      setAccessToken("");
      setVerifyToken("");
      setPhoneNumber("");
    } catch (err) {
      toast.error(`${t.connectors.whatsapp.toastConnectError}: ${(err as Error).message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    const confirmed = window.confirm(t.connectors.whatsapp.confirmDisconnect);
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/setup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, agentId }),
      });
      if (!res.ok) throw new Error("Disconnect failed");
      toast.success(t.connectors.whatsapp.toastDisconnected);
    } catch {
      toast.error(t.connectors.whatsapp.toastDisconnectError);
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <Phone className="h-4 w-4 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold">{t.connectors.whatsapp.title}</h2>
          </div>
        </div>

        {!connection ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.connectors.whatsapp.connect}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t.connectors.whatsapp.description}
              </p>

              <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">{t.connectors.whatsapp.howItWorks}</p>
                <ol className="list-inside list-decimal space-y-1">
                  <li>{t.connectors.whatsapp.step1}</li>
                  <li>{t.connectors.whatsapp.step2}</li>
                  <li>{t.connectors.whatsapp.step3}</li>
                  <li>{t.connectors.whatsapp.step4}</li>
                  <li>{t.connectors.whatsapp.step5}</li>
                </ol>
              </div>

              {/* Webhook URL to copy */}
              <div className="space-y-2">
                <Label>{t.connectors.whatsapp.webhookUrl}</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={handleCopyWebhookUrl}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t.connectors.whatsapp.webhookUrlHint}</p>
              </div>

              <div className="space-y-2">
                <Label>{t.connectors.whatsapp.phoneNumberId}</Label>
                <Input
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="123456789012345"
                />
              </div>

              <div className="space-y-2">
                <Label>{t.connectors.whatsapp.accessToken}</Label>
                <Input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAx..."
                />
              </div>

              <div className="space-y-2">
                <Label>{t.connectors.whatsapp.verifyToken}</Label>
                <Input
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  placeholder="my-custom-verify-token"
                />
              </div>

              <div className="space-y-2">
                <Label>{t.connectors.whatsapp.phoneNumber}</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+33612345678"
                />
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting || !phoneNumberId.trim() || !accessToken.trim()}
                className="w-full gap-2"
              >
                <Phone className="h-4 w-4" />
                {connecting ? t.common.loading : t.connectors.whatsapp.connect}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t.connectors.whatsapp.title}</CardTitle>
                <Badge variant={connection.enabled ? "default" : "secondary"}>
                  {connection.enabled ? t.connectors.whatsapp.connected : t.common.disabled}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {connection.phoneNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t.connectors.whatsapp.phoneNumber}</span>
                    <span className="text-sm font-medium">{connection.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.connectors.whatsapp.phoneNumberId}</span>
                  <span className="font-mono text-xs text-muted-foreground">{connection.phoneNumberId}</span>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {disconnecting ? t.common.loading : t.connectors.whatsapp.disconnect}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </SlideUp>
  );
}
