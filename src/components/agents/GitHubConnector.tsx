"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { updateAgent } from "@/actions/agents";
import { auth } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { GitBranch, Search, Lock, Globe, Check, X, Loader2 } from "lucide-react";

interface GitHubRepo {
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updatedAt: string;
  defaultBranch: string;
}

interface GitHubConnectorProps {
  agentId: string;
  connectedRepos: string[];
}

export function GitHubConnector({ agentId, connectedRepos }: GitHubConnectorProps) {
  const { user } = useAuth();
  const t = useDictionary();
  const [open, setOpen] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("No token");
      const res = await fetch("/api/github/repos", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "no_github_token" || data.error === "github_token_expired") {
          setError(t.github.noToken);
          return;
        }
        throw new Error(data.error);
      }
      const data = await res.json();
      setRepos(data.repos);
    } catch {
      setError(t.github.fetchFailed);
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (open) fetchRepos();
  }, [open, fetchRepos]);

  const toggleRepo = async (fullName: string) => {
    if (!user) return;
    const isConnected = connectedRepos.includes(fullName);
    const updated = isConnected
      ? connectedRepos.filter((r) => r !== fullName)
      : [...connectedRepos, fullName];
    try {
      await updateAgent(user.uid, agentId, { connectedRepos: updated });
      toast.success(
        isConnected
          ? t.github.disconnected.replace("{repo}", fullName)
          : t.github.connected.replace("{repo}", fullName)
      );
    } catch {
      toast.error(t.github.updateFailed);
    }
  };

  const filtered = repos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (r.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <GitBranch className="h-4 w-4" />
          {t.github.connectRepo}
          {connectedRepos.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {connectedRepos.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {t.github.connectRepo}
          </DialogTitle>
          <DialogDescription>{t.github.connectDesc}</DialogDescription>
        </DialogHeader>

        {/* Connected repos summary */}
        {connectedRepos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {connectedRepos.map((repo) => (
              <Badge
                key={repo}
                variant="default"
                className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                onClick={() => toggleRepo(repo)}
              >
                {repo}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.github.searchRepos}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Repo list */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t.common.loading}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <p className="text-xs text-muted-foreground">{t.github.reloginHint}</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              {t.common.noResults}
            </p>
          ) : (
            filtered.map((repo) => {
              const isConnected = connectedRepos.includes(repo.fullName);
              return (
                <button
                  key={repo.fullName}
                  onClick={() => toggleRepo(repo.fullName)}
                  className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 ${
                    isConnected ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5">
                    {repo.private ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {repo.fullName}
                      </span>
                      {repo.language && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {repo.description}
                      </p>
                    )}
                  </div>
                  {isConnected && (
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
