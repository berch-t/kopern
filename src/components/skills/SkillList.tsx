"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { skillsCollection, type SkillDoc } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { deleteSkill } from "@/actions/skills";
import { toast } from "sonner";
import { LocalizedLink } from "@/components/LocalizedLink";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { motion } from "framer-motion";

interface SkillListProps {
  agentId: string;
}

export function SkillList({ agentId }: SkillListProps) {
  const { user } = useAuth();
  const { data: skills, loading } = useCollection<SkillDoc>(
    user ? skillsCollection(user.uid, agentId) : null,
    "createdAt"
  );

  async function handleDelete(skillId: string) {
    if (!user) return;
    try {
      await deleteSkill(user.uid, agentId, skillId);
      toast.success("Skill deleted");
    } catch {
      toast.error("Failed to delete skill");
    }
  }

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading skills...</div>;
  }

  if (skills.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No skills yet. Add a skill to extend your agent&apos;s capabilities.
      </div>
    );
  }

  return (
    <StaggerChildren className="space-y-3">
      {skills.map((skill) => (
        <motion.div key={skill.id} variants={staggerItem}>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <LocalizedLink
                href={`/agents/${agentId}/skills/${skill.id}`}
                className="flex-1"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{skill.name}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {skill.description}
                  </span>
                </div>
              </LocalizedLink>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(skill.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </StaggerChildren>
  );
}
