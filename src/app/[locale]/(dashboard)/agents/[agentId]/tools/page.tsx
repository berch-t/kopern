"use client";

import { use, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { agentDoc, type AgentDoc } from "@/lib/firebase/firestore";
import { updateAgent } from "@/actions/agents";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SlideUp } from "@/components/motion/SlideUp";
import { ToolList } from "@/components/tools/ToolList";
import { ToolForm } from "@/components/tools/ToolForm";
import { BuiltinToolSelector } from "@/components/tools/BuiltinToolSelector";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { customToolTutorials } from "@/data/custom-tool-tutorials";
import { useLocale, useDictionary } from "@/providers/LocaleProvider";
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
  const [showTutorial, setShowTutorial] = useState(false);
  const locale = useLocale();
  const dict = useDictionary();

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTutorial(!showTutorial)}
            className={showTutorial ? "ring-2 ring-primary/50" : ""}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            {dict.tools.tutorial}
          </Button>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                {dict.tools.addTool}
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
      </div>

      {showTutorial && (
        <SlideUp>
          <div className="rounded-lg border bg-card p-6 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={() => setShowTutorial(false)}
              title={dict.tools.closeTutorial}
            >
              <X className="h-4 w-4" />
            </Button>
            <MarkdownRenderer
              content={customToolTutorials[locale as "en" | "fr"] || customToolTutorials.en}
              headingIds
            />
          </div>
        </SlideUp>
      )}

      <ToolList agentId={agentId} />
    </div>
  );
}
