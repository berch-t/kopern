"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { listMemories, addMemory, deleteMemory } from "@/actions/memory";
import type { MemoryEntryDoc, MemoryConfig } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FadeIn } from "@/components/motion/FadeIn";
import { Brain, Plus, Trash2, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface MemoryPanelProps {
  agentId: string;
  memoryConfig?: MemoryConfig;
}

const CATEGORY_COLORS: Record<string, string> = {
  fact: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  preference: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  context: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  custom: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

export default function MemoryPanel({ agentId, memoryConfig }: MemoryPanelProps) {
  const { user } = useAuth();
  const t = useDictionary();
  const [memories, setMemories] = useState<(MemoryEntryDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<string>("fact");
  const [saving, setSaving] = useState(false);

  const isEnabled = memoryConfig?.enabled && (memoryConfig.maxEntries ?? 0) > 0;
  const maxEntries = memoryConfig?.maxEntries || 100;

  useEffect(() => {
    if (!user || !isEnabled) {
      setLoading(false);
      return;
    }
    listMemories(user.uid, agentId)
      .then(setMemories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, agentId, isEnabled]);

  if (!isEnabled) {
    return (
      <FadeIn>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t.memory.notEnabled}</p>
            <p className="text-xs mt-1">{t.memory.enableHint}</p>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  async function handleAdd() {
    if (!user || !newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      await addMemory(user.uid, agentId, newKey.trim(), newValue.trim(), newCategory as MemoryEntryDoc["category"]);
      const updated = await listMemories(user.uid, agentId);
      setMemories(updated);
      setNewKey("");
      setNewValue("");
      setNewCategory("fact");
      setDialogOpen(false);
      toast.success(t.memory.saved);
    } catch {
      toast.error(t.memory.error ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(memoryId: string) {
    if (!user) return;
    try {
      await deleteMemory(user.uid, agentId, memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      toast.success(t.memory.deleted);
    } catch {
      toast.error(t.memory.error ?? "Error");
    }
  }

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t.memory.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {memories.length}/{maxEntries}
              </span>
              {/* Progress bar */}
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (memories.length / maxEntries) * 100)}%` }}
                />
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t.memory.add}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.memory.addDialog.title}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>{t.memory.key}</Label>
                      <Input
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="client_name, pricing, hours..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t.memory.value}</Label>
                      <Input
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder="M. Dupont, 150€/h, 9h-18h..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t.memory.category}</Label>
                      <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fact">{t.memory.categories.fact}</SelectItem>
                          <SelectItem value="preference">{t.memory.categories.preference}</SelectItem>
                          <SelectItem value="context">{t.memory.categories.context}</SelectItem>
                          <SelectItem value="custom">{t.memory.categories.custom}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAdd} disabled={!newKey.trim() || !newValue.trim() || saving} className="w-full">
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      {t.memory.addDialog.save}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t.memory.subtitle}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : memories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.memory.empty}</p>
          ) : (
            <div className="space-y-2">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-2 rounded-lg border p-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{m.key}</span>
                      {m.category && (
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[m.category] || CATEGORY_COLORS.custom}`}>
                          {t.memory.categories[m.category as keyof typeof t.memory.categories] || m.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{m.value}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-7 w-7 p-0"
                    onClick={() => handleDelete(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
