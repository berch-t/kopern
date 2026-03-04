"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { toolsCollection, type ToolDoc } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { deleteTool } from "@/actions/tools";
import { toast } from "sonner";
import Link from "next/link";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { motion } from "framer-motion";

interface ToolListProps {
  agentId: string;
}

export function ToolList({ agentId }: ToolListProps) {
  const { user } = useAuth();
  const { data: tools, loading } = useCollection<ToolDoc>(
    user ? toolsCollection(user.uid, agentId) : null,
    "createdAt"
  );

  async function handleDelete(toolId: string) {
    if (!user) return;
    try {
      await deleteTool(user.uid, agentId, toolId);
      toast.success("Tool deleted");
    } catch {
      toast.error("Failed to delete tool");
    }
  }

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading tools...</div>;
  }

  if (tools.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No custom tools yet.
      </div>
    );
  }

  return (
    <StaggerChildren className="space-y-3">
      {tools.map((tool) => (
        <motion.div key={tool.id} variants={staggerItem}>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <Link
                href={`/agents/${agentId}/tools/${tool.id}`}
                className="flex-1"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{tool.name}</Badge>
                  <span className="text-sm font-medium">{tool.label}</span>
                  <span className="text-sm text-muted-foreground">{tool.description}</span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(tool.id)}
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
