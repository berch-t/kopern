"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Share2, Unplug, Loader2, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

// ─── Platform SVG logos ──────────────────────────────────────────────

const BlueskyLogo = () => (
  <svg className="h-7 w-7" viewBox="0 0 568 501" fill="none">
    <path d="M123.121 33.6637C188.241 82.5526 258.281 181.681 284 234.873C309.719 181.681 379.759 82.5526 444.879 33.6637C491.866 -1.61183 568 -28.9064 568 57.9464C568 75.2916 558.055 189.42 552.175 210.098C531.688 285.361 455.89 300.261 388.347 289.452C507.222 310.349 539.5 388.167 472.5 466C346.063 614.209 291.747 425.956 284 398.198C276.253 425.956 221.937 614.209 95.5 466C28.5002 388.167 60.7779 310.349 179.653 289.452C112.11 300.261 36.3125 285.361 15.8249 210.098C9.94524 189.42 0 75.2916 0 57.9464C0 -28.9064 76.1338 -1.61183 123.121 33.6637Z" fill="#0085FF"/>
  </svg>
);

const TwitterLogo = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInLogo = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const FacebookLogo = () => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// ─── Component ──────────────────────────────────────────────────────

interface Props {
  agentId: string;
  hasSocialMedia: boolean;
}

export function SocialConnectorPanel({ agentId, hasSocialMedia }: Props) {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [disconnecting, setDisconnecting] = useState<SocialPlatform | null>(null);

  // Bluesky form
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

  const bskyConn = getConnector("bluesky");
  const today = new Date().toISOString().slice(0, 10);
  const bskyUsed = bskyConn && bskyConn.dailyPostDate === today ? bskyConn.dailyPostCount : 0;

  const comingSoonPlatforms = [
    { id: "twitter" as const, label: "Twitter / X", Logo: TwitterLogo },
    { id: "linkedin" as const, label: "LinkedIn", Logo: LinkedInLogo },
    { id: "facebook" as const, label: "Facebook", Logo: FacebookLogo },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Social Media</h3>
          </div>
        </div>

        {/* ── Bluesky (active) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
              bskyConn ? "border-green-500/30 bg-green-500/5" : "hover:bg-muted/50 cursor-pointer"
            }`}
            onClick={() => {
              if (!bskyConn && !showBskyForm) setShowBskyForm(true);
            }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              <BlueskyLogo />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">Bluesky</p>
              {bskyConn ? (
                <p className="text-[10px] text-green-600 dark:text-green-400">
                  @{bskyConn.handle} · {bskyUsed}/{bskyConn.dailyPostLimit} posts
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Not connected</p>
              )}
            </div>
            {bskyConn && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDisconnect("bluesky");
                }}
                disabled={disconnecting === "bluesky"}
              >
                {disconnecting === "bluesky" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>

          {/* ── Coming soon platforms ── */}
          {comingSoonPlatforms.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border p-3 opacity-50 cursor-default"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                <p.Logo />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{p.label}</p>
                <p className="text-[10px] text-muted-foreground">Not connected</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0">
                Coming soon
              </Badge>
            </div>
          ))}
        </div>

        {/* ── Bluesky connection form ── */}
        {showBskyForm && !bskyConn && (
          <div className="mt-4 space-y-3 rounded-lg border border-[#0085FF]/30 bg-[#0085FF]/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 text-[#0085FF]" />
              Connect Bluesky
            </div>
            <p className="text-xs text-muted-foreground">
              Create an App Password at bsky.app &rarr; Settings &rarr; App Passwords. Never use your main password.
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
                className="bg-[#0085FF] hover:bg-[#0085FF]/80"
              >
                {connecting === "bluesky" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                )}
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
