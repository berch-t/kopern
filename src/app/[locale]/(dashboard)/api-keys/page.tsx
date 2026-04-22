"use client";

import { useEffect, useState } from "react";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import {
  agentsCollection,
  type AgentDoc,
} from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { Key, Bot, ExternalLink, Plus, Copy, Trash2, Terminal, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";

interface AgentKeySummary {
  agentId: string;
  agentName: string;
  keyCount: number;
  lastUsedAt: string | null;
}

function PersonalKeySection() {
  const { user } = useAuth();
  const locale = useLocale();
  const t = useDictionary();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyInfo, setKeyInfo] = useState<{ exists: boolean; apiKeyPrefix?: string; apiKeyHash?: string; createdAt?: string; lastUsedAt?: string } | null>(null);

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
    <SlideUp>
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                {t.settings.personalKey}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">{t.settings.personalKeyDesc}</p>
            </div>
            {!keyInfo?.exists && (
              <Button onClick={handleGenerate} disabled={loading} size="sm">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {loading ? (locale === "fr" ? "Generation..." : "Generating...") : (locale === "fr" ? "Generer" : "Generate")}
              </Button>
            )}
          </div>

          {keyInfo?.exists && (
            <>
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-3 py-1.5 text-sm font-mono truncate max-w-full">
                  {newKey || `${keyInfo.apiKeyPrefix}${"*".repeat(20)}`}
                </code>
                {newKey && (
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => copyKey(newKey)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

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
                        {deleting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
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

              {newKey && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {t.settings.personalKeyShowOnce}
                </p>
              )}

              {/* Quick start snippets */}
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium">{locale === "fr" ? "Demarrage rapide" : "Quick Start"}</p>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Claude Code :</p>
                  <div className="relative">
                    <pre className="rounded border bg-muted px-3 py-2 text-xs font-mono overflow-x-auto">claude mcp add kopern -- npx -y @kopern/mcp-server</pre>
                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => copyKey("claude mcp add kopern -- npx -y @kopern/mcp-server")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cursor / Windsurf (.mcp.json) :</p>
                  <div className="relative">
                    <pre className="rounded border bg-muted px-3 py-2 text-xs font-mono overflow-x-auto">{mcpConfig || JSON.stringify({
  mcpServers: {
    kopern: {
      type: "http",
      url: "https://kopern.ai/api/mcp/server",
      headers: { Authorization: `Bearer ${keyInfo.apiKeyPrefix}...` },
    },
  },
}, null, 2)}</pre>
                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => copyKey(mcpConfig || JSON.stringify({
  mcpServers: {
    kopern: {
      type: "http",
      url: "https://kopern.ai/api/mcp/server",
      headers: { Authorization: "Bearer <your-key>" },
    },
  },
}, null, 2))}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {locale === "fr" ? "Cette cle donne acces a 30 outils plateforme (gestion agents, grading, teams, etc.)" : "This key gives access to 30 platform tools (agent management, grading, teams, etc.)"}
                  {" "}
                  <LocalizedLink href="/mcp" className="text-primary hover:underline inline-flex items-center gap-1">
                    {locale === "fr" ? "Documentation MCP" : "MCP Documentation"}
                    <ExternalLink className="h-3 w-3" />
                  </LocalizedLink>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </SlideUp>
  );
}

export default function ApiKeysOverviewPage() {
  const t = useDictionary();
  const locale = useLocale();
  const { user } = useAuth();
  const { data: agents } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );

  const [summaries, setSummaries] = useState<AgentKeySummary[]>([]);
  const [loading, setLoading] = useState(true);

   
  useEffect(() => {
    if (!user || agents.length === 0) {
      setLoading(false);
      return;
    }

    async function loadAll() {
      const token = await user!.getIdToken();
      const results: AgentKeySummary[] = [];

      for (const agent of agents) {
        try {
          const res = await fetch(`/api/mcp/keys?agentId=${agent.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const keys = data.keys || [];
            if (keys.length > 0) {
              const latestUsed = keys
                .map((k: { lastUsedAt: string | null }) => k.lastUsedAt)
                .filter(Boolean)
                .sort()
                .pop() || null;
              results.push({
                agentId: agent.id,
                agentName: agent.name,
                keyCount: keys.length,
                lastUsedAt: latestUsed,
              });
            }
          }
        } catch {
          // skip agent on error
        }
      }

      setSummaries(results);
      setLoading(false);
    }

    loadAll();
  }, [user, agents]);

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <SlideUp>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Key className="h-8 w-8" />
            {locale === "fr" ? "Cles API" : "API Keys"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {locale === "fr"
              ? "Toutes les cles API de vos agents pour le protocole MCP"
              : "All your agents' API keys for the MCP protocol"}
          </p>
        </div>
      </SlideUp>

      {/* Personal API key */}
      <PersonalKeySection />

      {/* Agent keys */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Key className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-lg font-medium">
              {locale === "fr" ? "Aucune cle API" : "No API keys yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              {locale === "fr"
                ? "Ouvrez un agent et generez une cle API dans l'onglet API Keys pour l'utiliser via MCP"
                : "Open an agent and generate an API key in the API Keys tab to use it via MCP"}
            </p>
            {agents.length > 0 && (
              <LocalizedLink href={`/agents/${agents[0].id}/api-keys`}>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  {locale === "fr" ? "Creer une cle" : "Create a key"}
                </Button>
              </LocalizedLink>
            )}
          </div>
        </SlideUp>
      ) : (
        <StaggerChildren className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => (
            <motion.div key={s.agentId} variants={staggerItem}>
              <LocalizedLink href={`/agents/${s.agentId}/api-keys`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{s.agentName}</span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Key className="h-3 w-3" />
                        <span>{s.keyCount} {s.keyCount === 1 ? (locale === "fr" ? "cle" : "key") : (locale === "fr" ? "cles" : "keys")}</span>
                      </div>
                      {s.lastUsedAt && (
                        <span className="text-xs text-muted-foreground">
                          {locale === "fr" ? "Derniere utilisation" : "Last used"} {formatDate(s.lastUsedAt)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </LocalizedLink>
            </motion.div>
          ))}
        </StaggerChildren>
      )}

      {/* Link to MCP docs */}
      <SlideUp delay={0.2}>
        <div className="text-center">
          <LocalizedLink href="/mcp" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            {locale === "fr" ? "Documentation MCP complete" : "Full MCP documentation"}
            <ExternalLink className="h-3 w-3" />
          </LocalizedLink>
        </div>
      </SlideUp>
    </div>
  );
}
