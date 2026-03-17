"use client";

import { use, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { LocalizedLink } from "@/components/LocalizedLink";
import {
  agentsCollection,
  type AgentDoc,
  type PipelineStep,
} from "@/lib/firebase/firestore";
import { createPipeline } from "@/actions/pipelines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { PipelineBuilder } from "@/components/pipelines/PipelineBuilder";
import { ArrowLeft } from "lucide-react";

export default function NewPipelinePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const router = useLocalizedRouter();

  const { data: agents } = useCollection<AgentDoc>(
    user ? agentsCollection(user.uid) : null,
    "updatedAt"
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim() && steps.length > 0 && steps.every((s) => s.agentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;

    setSubmitting(true);
    try {
      const pipelineId = await createPipeline(user.uid, agentId, {
        name: name.trim(),
        description: description.trim(),
        steps: steps.map((s, i) => ({ ...s, order: i })),
      });
      router.push(`/agents/${agentId}/pipelines/${pipelineId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center gap-3">
          <LocalizedLink href={`/agents/${agentId}/pipelines`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </LocalizedLink>
          <div>
            <h1 className="text-3xl font-bold">{t.pipelines.createPipeline}</h1>
            <p className="text-muted-foreground">
              {t.pipelines.noPipelinesDesc}
            </p>
          </div>
        </div>
      </SlideUp>

      <FadeIn delay={0.1}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">{t.pipelines.form.name}</Label>
              <Input
                id="pipeline-name"
                placeholder={t.pipelines.form.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pipeline-desc">
                {t.pipelines.form.description}
              </Label>
              <Textarea
                id="pipeline-desc"
                placeholder={t.pipelines.form.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Separator />

          <PipelineBuilder
            steps={steps}
            agents={agents}
            onStepsChange={setSteps}
          />

          <div className="flex items-center justify-end gap-3">
            <LocalizedLink href={`/agents/${agentId}/pipelines`}>
              <Button type="button" variant="outline">
                {t.common.cancel}
              </Button>
            </LocalizedLink>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? t.common.creating : t.pipelines.createPipeline}
            </Button>
          </div>
        </form>
      </FadeIn>
    </div>
  );
}
