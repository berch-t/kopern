"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Unplug, Loader2, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { toast } from "sonner";
import type { SocialPlatform } from "@/lib/firebase/firestore";

interface ConnectorStatus {
  platform: SocialPlatform;
  handle: string;
  displayName: string;
  enabled: boolean;
  dailyPostCount: number;
  dailyPostLimit: number;
  dailyPostDate: string;
}

const PLATFORMS: { id: SocialPlatform; label: string; available: boolean; authType: "app_password" | "oauth2" }[] = [
  { id: "bluesky", label: "Bluesky", available: true, authType: "app_password" },
  { id: "twitter", label: "Twitter / X", available: false, authType: "oauth2" },
  { id: "linkedin", label: "LinkedIn", available: false, authType: "oauth2" },
  { id: "facebook", label: "Facebook", available: false, authType: "oauth2" },
  { id: "instagram", label: "Instagram", available: false, authType: "oauth2" },
  { id: "tiktok", label: "TikTok", available: false, authType: "oauth2" },
];

interface Props {
  hasSocialMedia: boolean;
}

export function SocialConnectorPanel({ hasSocialMedia }: Props) {
  const { user } = useAuth();
  const dict = useDictionary();
  const t = dict.socialConnectors || {};
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [disconnecting, setDisconnecting] = useState<SocialPlatform | null>(null);

  // Bluesky form state
  const [bskyHandle, setBskyHandle] = useState("");
  const [bskyPassword, setBskyPassword] = useState("");
  const [showBskyForm, setShowBskyForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadConnectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadConnectors = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/social/connectors", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  if (!hasSocialMedia) return null;

  const handleConnectBluesky = async () => {
    if (!user || !bskyHandle || !bskyPassword) return;
    setConnecting("bluesky");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/oauth/bluesky", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ handle: bskyHandle, appPassword: bskyPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Connection failed");
        return;
      }
      toast.success(`Connected to Bluesky as @${data.handle}`);
      setShowBskyForm(false);
      setBskyHandle("");
      setBskyPassword("");
      await loadConnectors();
    } catch {
      toast.error("Network error");
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: SocialPlatform) => {
    if (!user) return;
    setDisconnecting(platform);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/oauth/bluesky`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConnectors((prev) => prev.filter((c) => c.platform !== platform));
        toast.success(`Disconnected from ${platform}`);
      }
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  const getConnector = (platform: SocialPlatform) =>
    connectors.find((c) => c.platform === platform);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4" />
          {t.title || "Social Media Connectors"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            {PLATFORMS.map((p) => {
              const conn = getConnector(p.id);
              const used = conn && conn.dailyPostDate === today ? conn.dailyPostCount : 0;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    !p.available ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{p.label}</div>
                    {conn ? (
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                        <Check className="h-3 w-3 mr-1" />
                        @{conn.handle}
                      </Badge>
                    ) : !p.available ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Coming soon
                      </Badge>
                    ) : null}
                    {conn && (
                      <span className="text-xs text-muted-foreground">
                        {used}/{conn.dailyPostLimit} posts today
                      </span>
                    )}
                  </div>
                  <div>
                    {conn ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(p.id)}
                        disabled={disconnecting === p.id}
                      >
                        {disconnecting === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Unplug className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    ) : p.available ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (p.id === "bluesky") setShowBskyForm(true);
                        }}
                      >
                        Connect
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bluesky App Password form */}
        {showBskyForm && !getConnector("bluesky") && (
          <div className="space-y-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 text-indigo-400" />
              Connect Bluesky (App Password)
            </div>
            <p className="text-xs text-muted-foreground">
              Create an App Password at bsky.app &gt; Settings &gt; App Passwords. Never use your main password.
            </p>
            <div className="space-y-2">
              <Label htmlFor="bsky-handle" className="text-xs">Handle</Label>
              <Input
                id="bsky-handle"
                placeholder="yourname.bsky.social"
                value={bskyHandle}
                onChange={(e) => setBskyHandle(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bsky-password" className="text-xs">App Password</Label>
              <Input
                id="bsky-password"
                type="password"
                placeholder="xxxx-xxxx-xxxx-xxxx"
                value={bskyPassword}
                onChange={(e) => setBskyPassword(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConnectBluesky}
                disabled={connecting === "bluesky" || !bskyHandle || !bskyPassword}
                className="bg-indigo-600 hover:bg-indigo-500"
              >
                {connecting === "bluesky" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                Connect
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowBskyForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
