"use client";

import { use, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ApiKeyDisplay } from "@/components/mcp/ApiKeyDisplay";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { Key, Plus, RotateCcw, Trash2, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary, useLocale } from "@/providers/LocaleProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AgentKeyInfo {
  hash: string;
  prefix: string;
  enabled: boolean;
  createdAt: string | null;
  lastUsedAt: string | null;
}

export default function ApiKeysPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const locale = useLocale();
  const t = useDictionary();

  const [keys, setKeys] = useState<AgentKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const fetchKeys = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/mcp/keys?agentId=${agentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, agentId]);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/mcp/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (data.apiKey) {
        setNewKey(data.apiKey);
        fetchKeys();
      } else {
        toast.error(data.error || "Failed to create key");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRotate = async (keyHash: string) => {
    if (!user) return;
    setRotating(keyHash);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/mcp/keys", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId, keyHash }),
      });
      const data = await res.json();
      if (data.apiKey) {
        setNewKey(data.apiKey);
        fetchKeys();
        toast.success(locale === "fr" ? "Cle renouvelee" : "Key rotated");
      }
    } finally {
      setRotating(null);
    }
  };

  const handleDelete = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/mcp/keys?agentId=${agentId}&keyHash=${deleteTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchKeys();
        toast.success(locale === "fr" ? "Cle supprimee" : "Key deleted");
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const mcpJsonSnippet = `{
  "mcpServers": {
    "kopern": {
      "type": "http",
      "url": "https://kopern.ai/api/mcp/server",
      "headers": {
        "Authorization": "Bearer <your-key>"
      }
    }
  }
}`;

  const cliSnippet = `claude mcp add kopern -- npx -y @kopern/mcp-server`;

  const handleCopySnippet = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{locale === "fr" ? "Cles API" : "API Keys"}</h1>
            <p className="text-muted-foreground">
              {locale === "fr"
                ? "Generez des cles pour acceder a cet agent via le protocole MCP"
                : "Generate keys to access this agent via the MCP protocol"}
            </p>
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {locale === "fr" ? "Nouvelle cle" : "New Key"}
          </Button>
        </div>
      </SlideUp>

      {/* Keys list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Key className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-lg font-medium">{locale === "fr" ? "Aucune cle API" : "No API keys"}</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              {locale === "fr"
                ? "Creez une cle pour connecter cet agent a Claude Code, Cursor, ou tout client MCP"
                : "Create a key to connect this agent to Claude Code, Cursor, or any MCP client"}
            </p>
            <Button className="mt-4" onClick={handleCreate} disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              {locale === "fr" ? "Creer une cle" : "Create Key"}
            </Button>
          </div>
        </SlideUp>
      ) : (
        <StaggerChildren className="space-y-3">
          {keys.map((k) => (
            <motion.div key={k.hash} variants={staggerItem}>
              <Card>
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <Key className="h-5 w-5 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <code className="text-sm font-mono">{k.prefix}{"•".repeat(20)}</code>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{locale === "fr" ? "Creee" : "Created"} {formatDate(k.createdAt)}</span>
                        {k.lastUsedAt && (
                          <span>{locale === "fr" ? "Derniere utilisation" : "Last used"} {formatDate(k.lastUsedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={k.enabled ? "default" : "secondary"}>
                      {k.enabled ? (locale === "fr" ? "Active" : "Active") : (locale === "fr" ? "Desactivee" : "Disabled")}
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRotate(k.hash)}
                      disabled={rotating === k.hash}
                      title={locale === "fr" ? "Renouveler" : "Rotate"}
                    >
                      {rotating === k.hash ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(k.hash)}
                      title={locale === "fr" ? "Supprimer" : "Delete"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </StaggerChildren>
      )}

      {/* Quick start */}
      <SlideUp delay={0.2}>
        <Card>
          <CardContent className="py-5 px-5 space-y-4">
            <h3 className="font-semibold">{locale === "fr" ? "Demarrage rapide" : "Quick Start"}</h3>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Claude Code :</p>
              <div className="relative">
                <pre className="rounded border bg-muted px-4 py-3 text-sm font-mono overflow-x-auto">{cliSnippet}</pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => handleCopySnippet(cliSnippet)}
                >
                  {copiedSnippet ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Cursor / Windsurf (.mcp.json) :</p>
              <div className="relative">
                <pre className="rounded border bg-muted px-4 py-3 text-sm font-mono overflow-x-auto">{mcpJsonSnippet}</pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => handleCopySnippet(mcpJsonSnippet)}
                >
                  {copiedSnippet ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {locale === "fr" ? "Remplacez " : "Replace "}
              <code className="text-xs">&lt;your-key&gt;</code>
              {locale === "fr" ? " par votre cle API. " : " with your API key. "}
              <LocalizedLink href="/mcp" className="text-primary hover:underline inline-flex items-center gap-1">
                {locale === "fr" ? "Documentation MCP complete" : "Full MCP documentation"}
                <ExternalLink className="h-3 w-3" />
              </LocalizedLink>
            </p>
          </CardContent>
        </Card>
      </SlideUp>

      {/* New key display dialog */}
      {newKey && (
        <ApiKeyDisplay
          apiKey={newKey}
          open={!!newKey}
          onClose={() => setNewKey(null)}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === "fr" ? "Supprimer la cle ?" : "Delete this key?"}</DialogTitle>
            <DialogDescription>
              {locale === "fr"
                ? "Cette action est irreversible. Toutes les integrations utilisant cette cle cesseront de fonctionner immediatement."
                : "This action cannot be undone. All integrations using this key will stop working immediately."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{locale === "fr" ? "Annuler" : "Cancel"}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {locale === "fr" ? "Supprimer" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
