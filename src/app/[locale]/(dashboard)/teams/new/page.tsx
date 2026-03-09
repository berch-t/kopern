"use client";

import { useState } from "react";
import { useDictionary } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { agentsCollection, type AgentDoc, type AgentTeamMember } from "@/lib/firebase/firestore";
import { createAgentTeam } from "@/actions/agent-teams";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { TeamMemberList } from "@/components/teams/TeamMemberList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { AgentAvatar } from "@/components/agents/AgentAvatar";

export default function NewTeamPage() {
  const { user } = useAuth();
  const t = useDictionary();
  const router = useLocalizedRouter();

  const { data: agents } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [executionMode, setExecutionMode] = useState<"parallel" | "sequential" | "conditional">("sequential");
  const [members, setMembers] = useState<AgentTeamMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const availableAgents = agents.filter(
    (a) => !members.some((m) => m.agentId === a.id)
  );

  function handleAddAgent(agentId: string) {
    setMembers((prev) => [
      ...prev,
      { agentId, role: "", order: prev.length, description: "" },
    ]);
    setDialogOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setSaving(true);
    try {
      const teamId = await createAgentTeam(user.uid, {
        name: name.trim(),
        description: description.trim(),
        agents: members,
        executionMode,
      });
      router.push(`/teams/${teamId}`);
    } catch (err) {
      console.error("Failed to create team:", err);
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SlideUp>
        <h1 className="text-3xl font-bold">{t.teams.createTeam}</h1>
        <p className="text-muted-foreground">{t.teams.noTeamsDesc}</p>
      </SlideUp>

      <form onSubmit={handleSubmit} className="space-y-6">
        <SlideUp delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.teams.form.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.teams.form.namePlaceholder}
                required
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.teams.form.description}</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.teams.form.descriptionPlaceholder}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t.teams.form.executionMode}</label>
                <Select value={executionMode} onValueChange={(v) => setExecutionMode(v as typeof executionMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parallel">{t.teams.form.parallel}</SelectItem>
                    <SelectItem value="sequential">{t.teams.form.sequential}</SelectItem>
                    <SelectItem value="conditional">{t.teams.form.conditional}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </SlideUp>

        <FadeIn delay={0.2}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t.teams.members}</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" disabled={availableAgents.length === 0}>
                    <Plus className="mr-2 h-3 w-3" />
                    {t.teams.addMember}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.teams.addMember}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {availableAgents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t.common.noResults}</p>
                    ) : (
                      availableAgents.map((agent) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => handleAddAgent(agent.id)}
                          className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                        >
                          <AgentAvatar branding={agent.branding} size="sm" />
                          <div>
                            <p className="text-sm font-medium">{agent.name}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {agent.description || agent.domain}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <TeamMemberList
                members={members}
                agents={agents}
                onUpdate={setMembers}
              />
            </CardContent>
          </Card>
        </FadeIn>

        <SlideUp delay={0.3}>
          <Separator />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? t.common.creating : t.common.create}
            </Button>
          </div>
        </SlideUp>
      </form>
    </div>
  );
}
