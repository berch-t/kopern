"use client";

import { useState, useEffect } from "react";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { skillDoc, type SkillDoc } from "@/lib/firebase/firestore";
import { updateSkill, createSkill } from "@/actions/skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MonacoWrapper } from "@/components/code/MonacoWrapper";
import { toast } from "sonner";

interface SkillEditorProps {
  agentId: string;
  skillId?: string;
  isNew?: boolean;
}

export function SkillEditor({ agentId, skillId, isNew }: SkillEditorProps) {
  const { user } = useAuth();
  const router = useLocalizedRouter();

  const { data: existing } = useDocument<SkillDoc>(
    user && skillId ? skillDoc(user.uid, agentId, skillId) : null
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(`---
description: ""
globs: ["**/*"]
---

# Skill Title

Instructions for the agent...
`);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description);
      setContent(existing.content);
    }
  }, [existing]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      if (isNew) {
        await createSkill(user.uid, agentId, { name, description, content });
        toast.success("Skill created");
      } else if (skillId) {
        await updateSkill(user.uid, agentId, skillId, { name, description, content });
        toast.success("Skill updated");
      }
      router.push(`/agents/${agentId}/skills`);
    } catch {
      toast.error("Failed to save skill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name (kebab-case)</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="invoice-parsing"
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Parses invoice documents"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Content (Markdown with frontmatter)</Label>
        <MonacoWrapper
          value={content}
          onChange={setContent}
          language="markdown"
          height="500px"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : isNew ? "Create Skill" : "Save Skill"}
        </Button>
      </div>
    </div>
  );
}
