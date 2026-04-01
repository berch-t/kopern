"use client";

import { use, useState } from "react";
import { useDictionary } from "@/providers/LocaleProvider";
import { useAuth } from "@/hooks/useAuth";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { useDocument } from "@/hooks/useFirestore";
import { agentDoc, type AgentDoc } from "@/lib/firebase/firestore";
import { deleteAgent } from "@/actions/agents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitHubConnector } from "@/components/agents/GitHubConnector";
import { FadeIn } from "@/components/motion/FadeIn";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: agent, loading } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null
  );
  const t = useDictionary();
  const router = useLocalizedRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    const confirmed = window.confirm(t.agents.detail.deleteConfirm);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteAgent(user.uid, agentId);
      toast.success(t.agents.detail.deleteSuccess);
      router.push("/agents");
    } catch {
      toast.error("Failed to delete agent");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">{t.agents.detail.loadingAgent}</div>;
  }

  if (!agent) {
    return <div className="text-destructive">{t.agents.detail.notFound}</div>;
  }

  return (
    <FadeIn>
      <div className="space-y-4">
        {/* Configuration overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t.agents.detail.configuration}</CardTitle>
              <div className="flex items-center gap-2">
                <GitHubConnector agentId={agentId} connectedRepos={agent.connectedRepos ?? []} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  {t.agents.detail.deleteAgent}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.agents.detail.provider}</span>
              <span>{agent.modelProvider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.agents.detail.model}</span>
              <span>{agent.modelId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.agents.detail.thinking}</span>
              <span>{agent.thinkingLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.agents.detail.builtinTools}</span>
              <span>{agent.builtinTools?.join(", ") || t.common.none}</span>
            </div>
          </CardContent>
        </Card>

        {/* System prompt preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.agents.detail.systemPrompt}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-3 rounded-lg max-h-[400px] overflow-y-auto">
              {agent.systemPrompt || t.agents.detail.noPrompt}
            </pre>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
