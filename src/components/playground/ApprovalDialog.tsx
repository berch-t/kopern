"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Check, X, Clock } from "lucide-react";
import { useDictionary } from "@/providers/LocaleProvider";
import type { PendingApproval } from "@/hooks/useAgent";

const TIMEOUT_MS = 120_000;

interface ApprovalDialogProps {
  approval: PendingApproval;
  onRespond: (decision: "approved" | "denied") => void;
}

export function ApprovalDialog({ approval, onRespond }: ApprovalDialogProps) {
  const t = useDictionary();
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, TIMEOUT_MS - (Date.now() - approval.timestamp)));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, TIMEOUT_MS - (Date.now() - approval.timestamp));
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onRespond("denied");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [approval.timestamp, onRespond]);

  const remainingSec = Math.ceil(remainingMs / 1000);
  const progressPct = (remainingMs / TIMEOUT_MS) * 100;

  const argsPreview = JSON.stringify(approval.args, null, 2);

  return (
    <div className="mx-4 mb-4 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <span className="font-semibold text-sm">
          {t.approval?.title ?? "Tool Approval Required"}
        </span>
        {approval.isDestructive && (
          <Badge variant="destructive" className="text-xs">
            {t.approval?.destructive ?? "Destructive"}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {t.approval?.toolLabel ?? "Tool"}: <span className="font-mono font-medium text-foreground">{approval.toolName}</span>
        </p>
        {argsPreview !== "{}" && (
          <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs font-mono">
            {argsPreview}
          </pre>
        )}
      </div>

      {/* Timeout progress bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{remainingSec}s</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="default"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => onRespond("approved")}
        >
          <Check className="h-4 w-4 mr-1" />
          {t.approval?.approve ?? "Approve"}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onRespond("denied")}
        >
          <X className="h-4 w-4 mr-1" />
          {t.approval?.deny ?? "Deny"}
        </Button>
      </div>
    </div>
  );
}
