"use client";

import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { widgetConfigDoc, type WidgetConfigDoc } from "@/lib/firebase/firestore";
import { saveWidgetConfig } from "@/actions/connectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SlideUp } from "@/components/motion/SlideUp";
import {
  ArrowLeft,
  Code,
  Copy,
  Check,
  Key,
  Globe,
  MessageSquare,
  Settings,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface WidgetConfiguratorProps {
  agentId: string;
  agentName: string;
  onBack: () => void;
}

export function WidgetConfigurator({ agentId, agentName, onBack }: WidgetConfiguratorProps) {
  const { user } = useAuth();
  const t = useDictionary();

  const docRef = useMemo(
    () => (user?.uid ? widgetConfigDoc(user.uid, agentId) : null),
    [user?.uid, agentId]
  );
  const { data: widgetData, loading } = useDocument<WidgetConfigDoc>(docRef);

  const [saving, setSaving] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Local form state (null = use Firestore value)
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<"bottom-right" | "bottom-left" | null>(null);
  const [showPoweredBy, setShowPoweredBy] = useState<boolean | null>(null);
  const [originsText, setOriginsText] = useState<string | null>(null);

  const resolvedEnabled = enabled ?? widgetData?.enabled ?? false;
  const resolvedWelcome = welcomeMessage ?? widgetData?.welcomeMessage ?? "";
  const resolvedPosition = position ?? widgetData?.position ?? "bottom-right";
  const resolvedShowPoweredBy = showPoweredBy ?? widgetData?.showPoweredBy ?? true;
  const resolvedOrigins = originsText ?? (widgetData?.allowedOrigins?.join("\n") ?? "");
  const apiKeyPrefix = widgetData?.apiKeyPrefix ?? "";
  const hasApiKey = !!apiKeyPrefix;

  const handleSave = useCallback(async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const origins = resolvedOrigins.split("\n").map((s) => s.trim()).filter(Boolean);
      await saveWidgetConfig(user.uid, agentId, {
        enabled: resolvedEnabled,
        welcomeMessage: resolvedWelcome,
        position: resolvedPosition,
        showPoweredBy: resolvedShowPoweredBy,
        allowedOrigins: origins,
      });
      toast.success(t.connectors.widget.toastSaved);
    } catch (err) {
      toast.error(t.connectors.widget.toastSaveError + ": " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [user?.uid, agentId, resolvedEnabled, resolvedWelcome, resolvedPosition, resolvedShowPoweredBy, resolvedOrigins]);

  const handleGenerateKey = useCallback(async () => {
    if (!user) return;
    setGeneratingKey(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/mcp/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId, name: "Widget" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate key");
      }

      const data = await res.json() as { apiKey: string; apiKeyPrefix: string; serverId: string };
      setGeneratedKey(data.apiKey);

      // Store the key info in widget config
      if (user.uid) {
        const { setDoc, serverTimestamp } = await import("firebase/firestore");
        const ref = widgetConfigDoc(user.uid, agentId);
        await setDoc(ref, {
          apiKeyPrefix: data.apiKeyPrefix,
          apiKeyPlain: data.apiKey,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      toast.success(t.connectors.widget.keyWarning);
    } catch (err) {
      toast.error(t.connectors.widget.toastKeyError + ": " + (err as Error).message);
    } finally {
      setGeneratingKey(false);
    }
  }, [user, agentId, t.connectors.widget.keyWarning]);

  const embedSnippet = generatedKey
    ? `<script src="https://kopern.vercel.app/api/widget/script" data-key="${generatedKey}" async></script>`
    : hasApiKey
      ? `<script src="https://kopern.vercel.app/api/widget/script" data-key="${apiKeyPrefix}..." async></script>`
      : "";

  const handleCopySnippet = useCallback(() => {
    if (!embedSnippet) return;
    navigator.clipboard.writeText(embedSnippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [embedSnippet]);

  const handleCopyKey = useCallback(() => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  }, [generatedKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
          <div>
            <h2 className="text-lg font-semibold">{t.connectors.widget.title}</h2>
            <p className="text-sm text-muted-foreground">{t.connectors.widget.description}</p>
          </div>
        </div>

        {/* Enable/Disable */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  {resolvedEnabled ? t.connectors.widget.enabled : t.connectors.widget.disabled}
                </Label>
              </div>
              <Switch checked={resolvedEnabled} onCheckedChange={(v) => setEnabled(v)} />
            </div>
          </CardContent>
        </Card>

        {/* API Key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4 text-amber-500" />
              {t.connectors.widget.apiKey}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasApiKey && !generatedKey && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">{apiKeyPrefix}...</Badge>
                <span className="text-xs text-muted-foreground">{t.common.active}</span>
              </div>
            )}

            {generatedKey && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {t.connectors.widget.keyWarning}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-xs break-all">
                    {generatedKey}
                  </code>
                  <Button size="icon" variant="outline" onClick={handleCopyKey}>
                    {copiedKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            <Button variant="outline" onClick={handleGenerateKey} disabled={generatingKey} className="w-full">
              {generatingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {hasApiKey ? t.connectors.widget.regenerateKey : t.connectors.widget.generateKey}
            </Button>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4 text-blue-500" />
              {t.connectors.widget.configuration}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                {t.connectors.widget.welcomeMessage}
              </Label>
              <Input
                value={resolvedWelcome}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder={t.connectors.widget.welcomeMessagePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.connectors.widget.position}</Label>
              <div className="flex gap-2">
                <Button
                  variant={resolvedPosition === "bottom-right" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPosition("bottom-right")}
                >
                  {t.connectors.widget.bottomRight}
                </Button>
                <Button
                  variant={resolvedPosition === "bottom-left" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPosition("bottom-left")}
                >
                  {t.connectors.widget.bottomLeft}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">{t.connectors.widget.poweredBy}</Label>
                <p className="text-xs text-muted-foreground">{t.connectors.widget.poweredByHint}</p>
              </div>
              <Switch checked={resolvedShowPoweredBy} onCheckedChange={(v) => setShowPoweredBy(v)} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                {t.connectors.widget.allowedOrigins}
              </Label>
              <Textarea
                value={resolvedOrigins}
                onChange={(e) => setOriginsText(e.target.value)}
                placeholder={t.connectors.widget.allowedOriginsPlaceholder}
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">{t.connectors.widget.allowedOriginsHint}</p>
            </div>
          </CardContent>
        </Card>

        {/* Embed Snippet */}
        {(hasApiKey || generatedKey) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Code className="h-4 w-4 text-emerald-500" />
                {t.connectors.widget.embedSnippet}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <pre className="rounded-lg border bg-muted p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {embedSnippet}
                </pre>
                <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7" onClick={handleCopySnippet}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onBack}>{t.common.cancel}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.common.save}
          </Button>
        </div>
      </div>
    </SlideUp>
  );
}
