"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { userDoc, type UserDoc } from "@/lib/firebase/firestore";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { linkGithubToCurrentUser } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { providers } from "@/lib/pi-mono/providers";
import { SlideUp } from "@/components/motion/SlideUp";
import { toast } from "sonner";
import { Eye, EyeOff, Github, Check } from "lucide-react";
import { useDictionary } from "@/providers/LocaleProvider";

export default function SettingsPage() {
  const t = useDictionary();
  const { user } = useAuth();
  const { data: userData } = useDocument<UserDoc>(
    user ? userDoc(user.uid) : null
  );

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [defaultProvider, setDefaultProvider] = useState("anthropic");
  const [defaultModel, setDefaultModel] = useState("claude-sonnet-4-6");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setApiKeys(userData.apiKeys || {});
      setDefaultProvider(userData.defaultProvider || "anthropic");
      setDefaultModel(userData.defaultModel || "claude-sonnet-4-6");
    }
  }, [userData]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        userDoc(user.uid),
        {
          displayName: user.displayName || "",
          email: user.email || "",
          apiKeys,
          defaultProvider,
          defaultModel,
          updatedAt: serverTimestamp(),
          ...(userData ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
      toast.success(t.settings.saved);
    } catch {
      toast.error(t.settings.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const hasGithub = user?.providerData.some((p) => p.providerId === "github.com") ?? false;
  const hasGithubToken = !!userData?.githubAccessToken;
  const [linkingGithub, setLinkingGithub] = useState(false);

  async function handleLinkGithub() {
    if (!user) return;
    setLinkingGithub(true);
    try {
      const { githubAccessToken } = await linkGithubToCurrentUser();
      if (githubAccessToken) {
        await setDoc(userDoc(user.uid), {
          githubAccessToken,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      toast.success(t.settings.githubLinked);
    } catch (err) {
      const authErr = err as { code?: string; message?: string };
      if (authErr.message === "github_already_linked") {
        toast.info(t.settings.githubAlreadyLinked);
      } else if (authErr.code === "auth/popup-closed-by-user") {
        // User cancelled — do nothing
      } else {
        console.error("GitHub link error:", err);
        toast.error(t.settings.githubLinkFailed);
      }
    } finally {
      setLinkingGithub(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SlideUp>
        <h1 className="text-3xl font-bold">{t.settings.title}</h1>
      </SlideUp>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub
          </CardTitle>
          <CardDescription>{t.settings.githubDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasGithub || hasGithubToken ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1 bg-emerald-600">
                <Check className="h-3 w-3" />
                {t.settings.githubConnected}
              </Badge>
            </div>
          ) : (
            <Button variant="outline" onClick={handleLinkGithub} disabled={linkingGithub}>
              <Github className="mr-2 h-4 w-4" />
              {linkingGithub ? t.common.loading : t.settings.connectGithub}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.apiKeys}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map((p) => (
            <div key={p.id} className="space-y-1">
              <Label>{p.name} API Key</Label>
              <div className="flex gap-2">
                <Input
                  type={showKeys[p.id] ? "text" : "password"}
                  value={apiKeys[p.id] || ""}
                  onChange={(e) =>
                    setApiKeys({ ...apiKeys, [p.id]: e.target.value })
                  }
                  placeholder={`Enter your ${p.name} API key...`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setShowKeys({ ...showKeys, [p.id]: !showKeys[p.id] })
                  }
                >
                  {showKeys[p.id] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.defaults}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.settings.defaultProvider}</Label>
            <Select value={defaultProvider} onValueChange={setDefaultProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.settings.defaultModel}</Label>
            <Input
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? t.common.saving : t.settings.saveSettings}
      </Button>
    </div>
  );
}
