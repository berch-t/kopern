"use client";

import { use, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { SkillList } from "@/components/skills/SkillList";
import { SkillEditor } from "@/components/skills/SkillEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SkillsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Skills</h1>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>New Skill</DialogTitle>
              </DialogHeader>
              <SkillEditor agentId={agentId} isNew />
            </DialogContent>
          </Dialog>
        </div>
      </SlideUp>

      <SkillList agentId={agentId} />
    </div>
  );
}
