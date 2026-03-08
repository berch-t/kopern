"use client";

import { use, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { agentDoc, type AgentDoc } from "@/lib/firebase/firestore";
import { updateAgent } from "@/actions/agents";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SlideUp } from "@/components/motion/SlideUp";
import { ToolList } from "@/components/tools/ToolList";
import { ToolForm } from "@/components/tools/ToolForm";
import { BuiltinToolSelector } from "@/components/tools/BuiltinToolSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ToolsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: agent } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null
  );
  const [showNew, setShowNew] = useState(false);

  async function handleBuiltinChange(tools: string[]) {
    if (!user) return;
    try {
      await updateAgent(user.uid, agentId, { builtinTools: tools });
      toast.success("Built-in tools updated");
    } catch {
      toast.error("Failed to update tools");
    }
  }

  return (
    <div className="space-y-6">
      <SlideUp>
        <h1 className="text-3xl font-bold">Tools</h1>
      </SlideUp>

      {agent && (
        <BuiltinToolSelector
          selected={agent.builtinTools}
          onChange={handleBuiltinChange}
        />
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Custom Tools</h2>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>New Custom Tool</DialogTitle>
            </DialogHeader>
            <ToolForm agentId={agentId} isNew />
          </DialogContent>
        </Dialog>
      </div>

      <ToolList agentId={agentId} />
    </div>
  );
}
