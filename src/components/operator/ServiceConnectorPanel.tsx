"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, RefreshCw, Unplug, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getServiceConnectors,
  disconnectService,
  getOAuthUrl,
} from "@/actions/service-connectors";
import type { ServiceConnectorDoc, ServiceProvider } from "@/lib/firebase/firestore";
import { useDictionary } from "@/providers/LocaleProvider";

interface Props {
  agentId: string;
  hasEmailTool: boolean;
  hasCalendarTool: boolean;
}

export function ServiceConnectorPanel({ agentId, hasEmailTool, hasCalendarTool }: Props) {
  const { user } = useAuth();
  const dict = useDictionary();
  const t = dict.serviceConnectors || {};
  const [google, setGoogle] = useState<ServiceConnectorDoc | null>(null);
  const [microsoft, setMicrosoft] = useState<ServiceConnectorDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<ServiceProvider | null>(null);

  useEffect(() => {
    if (!user) return;
    getServiceConnectors(user.uid).then(({ google: g, microsoft: m }) => {
      setGoogle(g);
      setMicrosoft(m);
      setLoading(false);
    });
  }, [user]);

  if (!hasEmailTool && !hasCalendarTool) return null;

  const handleConnect = (provider: ServiceProvider) => {
    if (!user) return;
    const scopes: string[] = [];
    if (hasEmailTool) scopes.push(provider === "google" ? "gmail" : "mail");
    if (hasCalendarTool) scopes.push("calendar");
    window.location.href = getOAuthUrl(provider, user.uid, scopes);
  };

  const handleDisconnect = async (provider: ServiceProvider) => {
    setDisconnecting(provider);
    try {
      await disconnectService(provider);
      if (provider === "google") setGoogle(null);
      else setMicrosoft(null);
    } catch {
      // toast error
    } finally {
      setDisconnecting(null);
    }
  };

  const isConnected = google || microsoft;
  const connectedProvider = google ? "google" : microsoft ? "microsoft" : null;
  const connectedDoc = google || microsoft;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          {t.title || "Service Connectors"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">{t.loading || "Loading..."}</div>
        ) : isConnected && connectedDoc ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  {connectedProvider === "google" ? "Google" : "Microsoft"}
                </Badge>
                <span className="text-sm text-muted-foreground">{connectedDoc.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisconnect(connectedProvider!)}
                disabled={disconnecting !== null}
              >
                {disconnecting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3" />}
                <span className="ml-1 text-xs">{t.disconnect || "Disconnect"}</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {hasEmailTool && (
                <div className="flex items-center gap-1.5 rounded-md border p-2">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  <span>{t.emailActive || "Email active"}</span>
                </div>
              )}
              {hasCalendarTool && (
                <div className="flex items-center gap-1.5 rounded-md border p-2">
                  <Calendar className="h-3.5 w-3.5 text-green-500" />
                  <span>{t.calendarActive || "Calendar active"}</span>
                </div>
              )}
            </div>

            {connectedDoc.expiresAt < Date.now() && (
              <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                {t.tokenExpired || "Token expired."}{" "}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => handleConnect(connectedProvider!)}
                >
                  {t.reconnect || "Reconnect"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t.notConnected || "Connect your Google or Microsoft account to enable email and calendar tools."}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleConnect("google")}>
                <ExternalLink className="mr-1 h-3 w-3" />
                Google
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleConnect("microsoft")}>
                <ExternalLink className="mr-1 h-3 w-3" />
                Microsoft
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
