"use client";

import { use } from "react";
import { SlideUp } from "@/components/motion/SlideUp";
import { ToolForm } from "@/components/tools/ToolForm";

export default function EditToolPage({
  params,
}: {
  params: Promise<{ agentId: string; toolId: string }>;
}) {
  const { agentId, toolId } = use(params);

  return (
    <div className="space-y-6">
      <SlideUp>
        <h1 className="text-3xl font-bold">Edit Tool</h1>
      </SlideUp>
      <ToolForm agentId={agentId} toolId={toolId} />
    </div>
  );
}
