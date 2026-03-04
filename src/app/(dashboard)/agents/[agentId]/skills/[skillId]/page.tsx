"use client";

import { use } from "react";
import { SlideUp } from "@/components/motion/SlideUp";
import { SkillEditor } from "@/components/skills/SkillEditor";

export default function EditSkillPage({
  params,
}: {
  params: Promise<{ agentId: string; skillId: string }>;
}) {
  const { agentId, skillId } = use(params);

  return (
    <div className="space-y-6">
      <SlideUp>
        <h1 className="text-3xl font-bold">Edit Skill</h1>
      </SlideUp>
      <SkillEditor agentId={agentId} skillId={skillId} />
    </div>
  );
}
