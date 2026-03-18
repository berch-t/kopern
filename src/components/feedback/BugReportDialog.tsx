"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Bug, Github, AlertTriangle, AlertCircle, Info, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/providers/LocaleProvider";

type Severity = "low" | "medium" | "high";

const SEVERITY_CONFIG: Record<Severity, { icon: typeof Info; color: string; badgeClass: string }> = {
  low: {
    icon: Info,
    color: "text-blue-500",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  medium: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    badgeClass: "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  },
  high: {
    icon: AlertCircle,
    color: "text-red-500",
    badgeClass: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

const GITHUB_URL = "https://github.com/berch-t/kopern";

export function BugReportDialog() {
  const [severity, setSeverity] = useState<Severity>("medium");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const t = useDictionary();
  const { user } = useAuth();

  // Pre-fill email from auth
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email]);

  const severityLabels: Record<Severity, string> = {
    low: t.bugReport.low,
    medium: t.bugReport.medium,
    high: t.bugReport.high,
  };

  const severityTag: Record<Severity, string> = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
  };

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity,
          description,
          pageUrl: window.location.href,
          reporterEmail: email.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setSent(true);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setDescription("");
        setEmail("");
        setSeverity("medium");
      }, 1500);
    } catch {
      // Fallback to mailto if API fails
      const subject = encodeURIComponent(`[Kopern Bug] [${severityTag[severity]}] Bug Report`);
      const body = encodeURIComponent(
        `Severity: ${severityTag[severity]}\n\n${description}\n\n---\nURL: ${window.location.href}`
      );
      window.open(`mailto:berchet.thomas@gmail.com?subject=${subject}&body=${body}`, "_self");
      setOpen(false);
      setDescription("");
      setEmail("");
      setSeverity("medium");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <Bug className="h-4 w-4" />
          <span className="hidden sm:inline">{t.bugReport.button}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            {t.bugReport.title}
          </DialogTitle>
          <DialogDescription>{t.bugReport.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Severity selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.bugReport.severity}</label>
            <div className="flex flex-col gap-2">
              {(["low", "medium", "high"] as Severity[]).map((level) => {
                const config = SEVERITY_CONFIG[level];
                const Icon = config.icon;
                const isSelected = severity === level;
                return (
                  <button
                    key={level}
                    onClick={() => setSeverity(level)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all",
                      isSelected
                        ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80 hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
                    <span className="flex-1">{severityLabels[level]}</span>
                    {isSelected && (
                      <Badge className={config.badgeClass} variant="outline">
                        {severityTag[level]}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.bugReport.descriptionLabel}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.bugReport.descriptionPlaceholder}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Email (optional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t.bugReport.emailLabel} <span className="text-muted-foreground font-normal">({t.bugReport.emailOptional})</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.bugReport.emailPlaceholder}
            />
            <p className="text-xs text-muted-foreground">{t.bugReport.emailHint}</p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <Button
            onClick={handleSend}
            disabled={description.trim().length < 10 || sending || sent}
            className="w-full"
          >
            {sent ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t.bugReport.sent}
              </>
            ) : sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.bugReport.sending}
              </>
            ) : (
              t.bugReport.send
            )}
          </Button>

          {/* GitHub contribution link */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>{t.bugReport.contribute}</span>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Github className="h-3.5 w-3.5" />
              {t.bugReport.githubCta}
            </a>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
