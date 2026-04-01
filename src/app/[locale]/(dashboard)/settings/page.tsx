"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { userDoc, type UserDoc } from "@/lib/firebase/firestore";
import { setDoc, serverTimestamp } from "firebase/firestore";
import { linkGithubToCurrentUser } from "@/lib/firebase/auth";
import { useConsent } from "@/hooks/useConsent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { FadeIn } from "@/components/motion/FadeIn";
import { toast } from "sonner";
import { Eye, EyeOff, Github, Check, Shield, Download, Trash2, Plus, X, Key, Copy, Terminal } from "lucide-react";
import { useDictionary } from "@/providers/LocaleProvider";
import { LocalizedLink } from "@/components/LocalizedLink";

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

      {/* Personal API Key — prominent first card */}
      <PersonalApiKeyCard />

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
          <CardDescription>{t.settings.apiKeysDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map((p) => {
            // Collect all keys for this provider: primary + _2, _3, _4, _5
            const extraKeys = [2, 3, 4, 5].filter((i) => apiKeys[`${p.id}_${i}`] !== undefined);

            return (
              <div key={p.id} className="space-y-2">
                <Label>{p.name} API Key</Label>
                {/* Primary key */}
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
                {/* Extra keys for failover */}
                {extraKeys.map((i) => (
                  <div key={`${p.id}_${i}`} className="flex gap-2 pl-4">
                    <Input
                      type={showKeys[`${p.id}_${i}`] ? "text" : "password"}
                      value={apiKeys[`${p.id}_${i}`] || ""}
                      onChange={(e) =>
                        setApiKeys({ ...apiKeys, [`${p.id}_${i}`]: e.target.value })
                      }
                      placeholder={`${t.settings.failoverKey} ${i}...`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setShowKeys({ ...showKeys, [`${p.id}_${i}`]: !showKeys[`${p.id}_${i}`] })
                      }
                    >
                      {showKeys[`${p.id}_${i}`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const next = { ...apiKeys };
                        delete next[`${p.id}_${i}`];
                        setApiKeys(next);
                      }}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                {/* Add failover key button */}
                {apiKeys[p.id] && extraKeys.length < 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground pl-4"
                    onClick={() => {
                      const nextIndex = extraKeys.length > 0 ? extraKeys[extraKeys.length - 1] + 1 : 2;
                      if (nextIndex <= 5) {
                        setApiKeys({ ...apiKeys, [`${p.id}_${nextIndex}`]: "" });
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t.settings.addFailoverKey}
                  </Button>
                )}
              </div>
            );
          })}
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

      <Separator className="my-4" />

      {/* GDPR — Data & Privacy */}
      <GdprSection />
    </div>
  );
}

function GdprSection() {
  const t = useDictionary();
  const { user } = useAuth();
  const { consent, updateConsent, hasFunctionalConsent } = useConsent();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleExport() {
    if (!user) return;
    setExporting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/gdpr/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kopern-data-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t.gdpr.exportSuccess);
    } catch {
      toast.error(t.gdpr.exportError);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/gdpr/delete", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(t.gdpr.deleteSuccess);
      // Redirect after deletion — auth state will clear
      window.location.href = "/";
    } catch {
      toast.error(t.gdpr.deleteError);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <FadeIn delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t.gdpr.dataPrivacy}
          </CardTitle>
          <CardDescription>{t.gdpr.dataPrivacyDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Consent preferences */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t.gdpr.consentPreferences}</h3>
            <p className="text-xs text-muted-foreground">{t.gdpr.consentPreferencesDesc}</p>

            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <span className="text-sm font-medium">{t.consent.essential}</span>
                <Badge variant="secondary" className="text-[10px] ml-2">{t.consent.alwaysActive}</Badge>
                <p className="text-xs text-muted-foreground mt-0.5">{t.consent.essentialDesc}</p>
              </div>
              <Switch checked disabled className="opacity-50" />
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <span className="text-sm font-medium">{t.consent.functional}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{t.consent.functionalDesc}</p>
              </div>
              <Switch
                checked={hasFunctionalConsent}
                onCheckedChange={(checked) => {
                  updateConsent({ essential: true, functional: checked });
                  toast.success(t.consent.updatedToast);
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Data export */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium">{t.gdpr.exportData}</h3>
              <p className="text-xs text-muted-foreground">{t.gdpr.exportDataDesc}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? t.gdpr.exporting : t.gdpr.exportButton}
            </Button>
          </div>

          <Separator />

          {/* Account deletion */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-destructive">{t.gdpr.deleteAccount}</h3>
              <p className="text-xs text-muted-foreground">{t.gdpr.deleteAccountDesc}</p>
            </div>
            {confirmDelete ? (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  {t.common.cancel}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? t.gdpr.deleting : t.gdpr.deleteButton}
                </Button>
              </div>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t.gdpr.deleteButton}
              </Button>
            )}
          </div>
          {confirmDelete && (
            <p className="text-xs text-destructive">{t.gdpr.deleteConfirm}</p>
          )}

          <Separator />

          {/* Links */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <LocalizedLink href="/privacy" className="hover:text-foreground underline underline-offset-2">
              {t.consent.privacyLink}
            </LocalizedLink>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

function PersonalApiKeyCard() {
  const t = useDictionary();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyInfo, setKeyInfo] = useState<{ exists: boolean; apiKeyPrefix?: string; apiKeyHash?: string; createdAt?: string; lastUsedAt?: string } | null>(null);

  // Fetch existing key info on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/mcp/user-key", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setKeyInfo(await res.json());
      } catch { /* ignore */ }
    })();
  }, [user]);

  async function handleGenerate() {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/mcp/user-key", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to generate key");
        return;
      }
      const data = await res.json();
      setNewKey(data.apiKey);
      setKeyInfo({ exists: true, apiKeyPrefix: data.apiKeyPrefix, apiKeyHash: data.apiKeyHash });
      toast.success(t.settings.personalKeyGenerated);
    } catch {
      toast.error("Failed to generate key");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!user || !keyInfo?.apiKeyHash) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/mcp/user-key?hash=${keyInfo.apiKeyHash}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setKeyInfo({ exists: false });
        setNewKey(null);
        setConfirmDelete(false);
        toast.success(t.settings.personalKeyDeleted);
      }
    } catch {
      toast.error("Failed to delete key");
    } finally {
      setDeleting(false);
    }
  }

  function copyKey(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(t.settings.personalKeyCopied);
  }

  const mcpConfig = newKey
    ? JSON.stringify({
        mcpServers: {
          kopern: {
            type: "http",
            url: "https://kopern.ai/api/mcp/server",
            headers: { Authorization: `Bearer ${newKey}` },
          },
        },
      }, null, 2)
    : null;

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          {t.settings.personalKey}
        </CardTitle>
        <CardDescription>{t.settings.personalKeyDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {keyInfo?.exists ? (
          <>
            {/* Key value + copy */}
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-3 py-1.5 text-sm font-mono truncate max-w-full">
                {newKey || `${keyInfo.apiKeyPrefix}${"*".repeat(20)}`}
              </code>
              {newKey && (
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => copyKey(newKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Status + delete */}
            <div className="flex items-center justify-between">
              <Badge variant="default" className="bg-emerald-600 text-xs">
                {t.settings.personalKeyActive}
              </Badge>
              <div className="flex gap-2">
                {confirmDelete ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                      {t.common.cancel}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t.settings.personalKeyDelete}
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t.settings.personalKeyDelete}
                  </Button>
                )}
              </div>
            </div>

            {confirmDelete && (
              <p className="text-xs text-destructive">{t.settings.personalKeyDeleteConfirm}</p>
            )}

            {/* Show MCP config after generation */}
            {newKey && (
              <div className="space-y-2">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {t.settings.personalKeyShowOnce}
                </p>
                <div className="relative">
                  <pre className="rounded-lg bg-muted p-4 text-xs font-mono overflow-x-auto">{mcpConfig}</pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyKey(mcpConfig!)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* No key yet — generate button */
          <Button onClick={handleGenerate} disabled={loading}>
            <Terminal className="h-4 w-4 mr-2" />
            {loading ? t.common.loading : t.settings.personalKeyGenerate}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
