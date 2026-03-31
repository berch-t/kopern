"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listRoutines, createRoutine, updateRoutine, deleteRoutine } from "@/actions/team-routines";
import type { RoutineDoc, AgentDoc, ConcurrencyPolicy } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Clock, Plus, Trash2, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const CRON_PRESETS = [
  { label: "Every day at 9:00", value: "0 9 * * *" },
  { label: "Mon-Fri at 9:00", value: "0 9 * * 1-5" },
  { label: "Every Monday at 8:00", value: "0 8 * * 1" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every hour", value: "0 * * * *" },
];

interface RoutineEditorProps {
  teamId: string;
  agents: (AgentDoc & { id: string })[];
}

export function RoutineEditor({ teamId, agents }: RoutineEditorProps) {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<(RoutineDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New routine form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cron, setCron] = useState("0 9 * * *");
  const [agentId, setAgentId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [concurrency, setConcurrency] = useState<ConcurrencyPolicy>("skip_if_active");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    listRoutines(user.uid, teamId)
      .then(setRoutines)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, teamId]);

  function getAgentName(id: string) {
    return agents.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreate() {
    if (!user || !name.trim() || !agentId || !prompt.trim()) return;
    setSaving(true);
    try {
      await createRoutine(user.uid, teamId, {
        name: name.trim(),
        description: description.trim(),
        cron,
        agentId,
        prompt: prompt.trim(),
        concurrencyPolicy: concurrency,
      });
      const updated = await listRoutines(user.uid, teamId);
      setRoutines(updated);
      setDialogOpen(false);
      setName(""); setDescription(""); setPrompt("");
      toast.success("Routine created");
    } catch {
      toast.error("Failed to create routine");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(routine: RoutineDoc & { id: string }) {
    if (!user) return;
    await updateRoutine(user.uid, teamId, routine.id, { enabled: !routine.enabled });
    setRoutines((prev) =>
      prev.map((r) => (r.id === routine.id ? { ...r, enabled: !r.enabled } : r)),
    );
  }

  async function handleDelete(routineId: string) {
    if (!user) return;
    await deleteRoutine(user.uid, teamId, routineId);
    setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    toast.success("Routine deleted");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">Routines</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Routine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Routine</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Daily report" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Generate a daily summary..." />
              </div>
              <div className="space-y-1.5">
                <Label>Schedule (cron)</Label>
                <div className="flex gap-2">
                  <Input value={cron} onChange={(e) => setCron(e.target.value)} className="font-mono text-sm flex-1" />
                  <Select value={cron} onValueChange={setCron}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Presets" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRON_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Agent</Label>
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prompt</Label>
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Generate today's summary report..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>Concurrency Policy</Label>
                <Select value={concurrency} onValueChange={(v) => setConcurrency(v as ConcurrencyPolicy)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip_if_active">Skip if active</SelectItem>
                    <SelectItem value="coalesce_if_active">Coalesce if active</SelectItem>
                    <SelectItem value="always_enqueue">Always enqueue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} disabled={saving || !name.trim() || !agentId || !prompt.trim()} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Routine
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {routines.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No routines configured</p>
            <p className="text-xs mt-1">Create a routine to automate agent tasks on a schedule.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {routines.map((routine) => (
            <Card key={routine.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Switch checked={routine.enabled} onCheckedChange={() => handleToggle(routine)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{routine.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{routine.cron}</Badge>
                      {routine.lastRunStatus === "success" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      {routine.lastRunStatus === "error" && (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Agent: {getAgentName(routine.agentId)}
                      {routine.lastRunAt && (
                        <> — Last run: {routine.lastRunAt.toDate?.().toLocaleString() ?? "—"}</>
                      )}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(routine.id)} className="h-7 w-7 p-0">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </FadeIn>
  );
}
