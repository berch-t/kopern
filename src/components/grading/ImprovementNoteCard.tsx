"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { Check, Plus, Send, Loader2, BookOpen, Wrench, Settings, Info } from "lucide-react";
import { useDictionary } from "@/providers/LocaleProvider";
import { createSkill } from "@/actions/skills";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";

interface ImprovementNoteData {
  category: "system_prompt" | "skill" | "tool" | "general";
  severity: "critical" | "suggestion";
  title: string;
  detail: string;
  appliedAt?: unknown;
  appliedAction?: string | null;
}

interface ImprovementNoteCardProps {
  note: ImprovementNoteData;
  noteIndex: number;
  userId: string;
  agentId: string;
  suiteId: string;
  runId: string | null;
  /** Called after a note is applied — caller can update local state */
  onApplied?: (noteIndex: number, action: string) => void;
}

const CATEGORY_ICONS = {
  system_prompt: Settings,
  skill: BookOpen,
  tool: Wrench,
  general: Info,
};

// Category labels are now provided via i18n (t.grading.improvementNotes.categories)

export function ImprovementNoteCard({
  note,
  noteIndex,
  userId,
  agentId,
  suiteId,
  runId,
  onApplied,
}: ImprovementNoteCardProps) {
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<string | null>(note.appliedAction || null);
  const t = useDictionary();
  const tNotes = t.grading.improvementNotes;
  const Icon = CATEGORY_ICONS[note.category] || Info;

  const markNoteApplied = async (action: string) => {
    if (!runId) return;
    try {
      const runRef = doc(db, `users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}`);
      const snap = await getDoc(runRef);
      if (!snap.exists()) return;
      const notes = [...(snap.data().improvementNotes || [])];
      if (notes[noteIndex]) {
        notes[noteIndex] = {
          ...notes[noteIndex],
          appliedAt: new Date().toISOString(),
          appliedAction: action,
        };
        await updateDoc(runRef, { improvementNotes: notes });
      }
    } catch {
      // best-effort persistence
    }
  };

  const handleAddSkill = async () => {
    setLoading(true);
    try {
      // Extract first paragraph as description, full detail as content
      const firstParagraph = note.detail.split("\n\n")[0]?.replace(/[#*`]/g, "").trim() || note.title;
      await createSkill(userId, agentId, {
        name: note.title.replace(/^(Créer|Create|Add|Ajouter)\s+(un\s+)?skill\s*/i, "").trim() || note.title,
        description: firstParagraph.slice(0, 200),
        content: note.detail,
      });
      await markNoteApplied("skill_added");
      setApplied("skill_added");
      onApplied?.(noteIndex, "skill_added");
      toast.success(tNotes.skillAdded);
    } catch (err) {
      toast.error(tNotes.error + ": " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToOptimize = async () => {
    setLoading(true);
    try {
      // Read current pending notes and append
      const agentRef = doc(db, `users/${userId}/agents/${agentId}`);
      const agentSnap = await getDoc(agentRef);
      const existing = agentSnap.data()?.pendingOptimizationRequest?.notes || [];
      await updateDoc(agentRef, {
        pendingOptimizationRequest: {
          sourceRunId: runId || "",
          sourceSuiteId: suiteId,
          notes: [...existing, { category: note.category, severity: note.severity, title: note.title, detail: note.detail }],
          createdAt: serverTimestamp(),
        },
      });
      await markNoteApplied("sent_to_optimize");
      setApplied("sent_to_optimize");
      onApplied?.(noteIndex, "sent_to_optimize");
      toast.success(tNotes.sentToOptimize);
    } catch (err) {
      toast.error(tNotes.error + ": " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const isApplied = !!applied;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        note.severity === "critical" ? "border-destructive/30 bg-destructive/5" : "border-border",
        isApplied && "border-emerald-500/30 bg-emerald-500/5"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge
          variant={note.severity === "critical" ? "destructive" : "outline"}
          className="text-xs"
        >
          {note.severity}
        </Badge>
        <Badge variant="secondary" className="text-xs gap-1">
          <Icon className="h-3 w-3" />
          {tNotes.categories[note.category]}
        </Badge>
        <span className="text-sm font-medium flex-1">{note.title}</span>

        {/* Applied indicator */}
        {isApplied && (
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 gap-1">
            <Check className="h-3 w-3" />
            {applied === "skill_added" || applied === "tool_added" ? tNotes.applied : tNotes.sent}
          </Badge>
        )}
      </div>

      <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
        <MarkdownRenderer content={note.detail} />
      </div>

      {/* Action buttons — only if not yet applied */}
      {!isApplied && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
          {note.category === "skill" && (
            <Button size="sm" variant="outline" onClick={handleAddSkill} disabled={loading} className="gap-1.5 text-xs">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              {tNotes.addSkill}
            </Button>
          )}
          {(note.category === "system_prompt" || note.category === "tool" || note.category === "general") && (
            <Button size="sm" variant="outline" onClick={handleSendToOptimize} disabled={loading} className="gap-1.5 text-xs">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {tNotes.sendToLab}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Batch action: send ALL system_prompt notes to optimization */
export function SendAllToOptimizeButton({
  notes,
  userId,
  agentId,
  suiteId,
  runId,
  onDone,
}: {
  notes: ImprovementNoteData[];
  userId: string;
  agentId: string;
  suiteId: string;
  runId: string | null;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const t = useDictionary();
  const tNotes = t.grading.improvementNotes;

  const promptNotes = notes.filter(n => n.category === "system_prompt" && !n.appliedAction);
  if (promptNotes.length === 0 && !done) return null;

  const handleSendAll = async () => {
    setLoading(true);
    try {
      const agentRef = doc(db, `users/${userId}/agents/${agentId}`);
      const agentSnap = await getDoc(agentRef);
      const existing = agentSnap.data()?.pendingOptimizationRequest?.notes || [];
      const newNotes = promptNotes.map(n => ({
        category: n.category,
        severity: n.severity,
        title: n.title,
        detail: n.detail,
      }));
      await updateDoc(agentRef, {
        pendingOptimizationRequest: {
          sourceRunId: runId || "",
          sourceSuiteId: suiteId,
          notes: [...existing, ...newNotes],
          createdAt: serverTimestamp(),
        },
      });

      // Mark all as applied in run doc
      if (runId) {
        try {
          const runRef = doc(db, `users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}`);
          const snap = await getDoc(runRef);
          if (snap.exists()) {
            const allNotes = [...(snap.data().improvementNotes || [])];
            for (let i = 0; i < allNotes.length; i++) {
              if (allNotes[i].category === "system_prompt" && !allNotes[i].appliedAction) {
                allNotes[i] = { ...allNotes[i], appliedAt: new Date().toISOString(), appliedAction: "sent_to_optimize" };
              }
            }
            await updateDoc(runRef, { improvementNotes: allNotes });
          }
        } catch { /* best-effort */ }
      }

      setDone(true);
      onDone?.();
      toast.success(tNotes.suggestionsSent.replace("{count}", String(promptNotes.length)));
    } catch (err) {
      toast.error(tNotes.error + ": " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 gap-1">
        <Check className="h-3 w-3" />
        {tNotes.suggestionsSent.replace("{count}", String(promptNotes.length))}
      </Badge>
    );
  }

  return (
    <Button size="sm" onClick={handleSendAll} disabled={loading} className="gap-1.5">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      {tNotes.sendAllToLab} ({promptNotes.length})
    </Button>
  );
}
