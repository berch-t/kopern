"use client";

import { useState, useRef, useEffect } from "react";
import { useDictionary } from "@/providers/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck } from "lucide-react";

interface PurposeDialogProps {
  question: string;
  onSubmit: (purpose: string) => void;
  onSkip: () => void;
}

export function PurposeDialog({
  question,
  onSubmit,
  onSkip,
}: PurposeDialogProps) {
  const t = useDictionary();
  const [purpose, setPurpose] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus textarea on mount
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!purpose.trim()) return;
    onSubmit(purpose.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (purpose.trim()) {
        onSubmit(purpose.trim());
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border bg-card p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{question}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            ref={textareaRef}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.playground.purposePlaceholder}
            className="min-h-[120px] resize-none"
          />

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onSkip}>
              {t.playground.skipPurpose}
            </Button>
            <Button type="submit" disabled={!purpose.trim()}>
              {t.playground.startSession}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
