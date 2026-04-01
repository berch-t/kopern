"use client";

import { use } from "react";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { useDictionary } from "@/providers/LocaleProvider";
import {
  pipelinesCollection,
  type PipelineDoc,
} from "@/lib/firebase/firestore";
import { deletePipeline } from "@/actions/pipelines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlideUp } from "@/components/motion/SlideUp";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Workflow,
  Trash2,
} from "lucide-react";

export default function PipelinesPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const { data: pipelines, loading } = useCollection<PipelineDoc>(
    user ? pipelinesCollection(user.uid, agentId) : null,
    "updatedAt"
  );

  const handleDelete = async (pipelineId: string) => {
    if (!user) return;
    await deletePipeline(user.uid, agentId, pipelineId);
  };

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LocalizedLink href={`/agents/${agentId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </LocalizedLink>
            <div>
              <h1 className="text-3xl font-bold">{t.pipelines.title}</h1>
              <p className="text-muted-foreground">
                {t.pipelines.noPipelinesDesc}
              </p>
            </div>
          </div>
          <LocalizedLink href={`/agents/${agentId}/pipelines/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t.pipelines.newPipeline}
            </Button>
          </LocalizedLink>
        </div>
      </SlideUp>

      {loading ? (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : pipelines.length === 0 ? (
        <SlideUp delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Workflow className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-lg font-medium">{t.pipelines.noPipelines}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.pipelines.noPipelinesDesc}
            </p>
            <LocalizedLink href={`/agents/${agentId}/pipelines/new`}>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                {t.pipelines.createPipeline}
              </Button>
            </LocalizedLink>
          </div>
        </SlideUp>
      ) : (
        <StaggerChildren className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {pipelines.map((pipeline) => (
            <motion.div key={pipeline.id} variants={staggerItem}>
              <LocalizedLink
                href={`/agents/${agentId}/pipelines/${pipeline.id}`}
              >
                <Card className="cursor-pointer transition-shadow hover:shadow-md group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {pipeline.name}
                      </CardTitle>
                      <Badge variant="secondary">
                        {pipeline.steps.length}{" "}
                        {pipeline.steps.length === 1 ? "step" : "steps"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pipeline.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pipeline.description}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {pipeline.steps.slice(0, 3).map((step, i) => (
                          <span key={i} className="flex items-center gap-1">
                            {i > 0 && (
                              <ArrowRight className="h-3 w-3" />
                            )}
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              {step.role || `Step ${i + 1}`}
                            </span>
                          </span>
                        ))}
                        {pipeline.steps.length > 3 && (
                          <span className="text-muted-foreground">
                            +{pipeline.steps.length - 3}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(pipeline.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </LocalizedLink>
            </motion.div>
          ))}
        </StaggerChildren>
      )}
    </div>
  );
}
