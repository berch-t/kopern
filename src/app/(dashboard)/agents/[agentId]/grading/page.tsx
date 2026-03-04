"use client";

import { use, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import { gradingSuitesCollection, type GradingSuiteDoc } from "@/lib/firebase/firestore";
import { createGradingSuite, deleteGradingSuite } from "@/actions/grading-suites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { SuiteCard } from "@/components/grading/SuiteCard";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function GradingPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const { data: suites, loading } = useCollection<GradingSuiteDoc>(
    user ? gradingSuitesCollection(user.uid, agentId) : null,
    "createdAt"
  );
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate() {
    if (!user || !name.trim()) return;
    try {
      await createGradingSuite(user.uid, agentId, { name, description });
      toast.success("Grading suite created");
      setShowNew(false);
      setName("");
      setDescription("");
    } catch {
      toast.error("Failed to create suite");
    }
  }

  async function handleDelete(suiteId: string) {
    if (!user) return;
    try {
      await deleteGradingSuite(user.uid, agentId, suiteId);
      toast.success("Suite deleted");
    } catch {
      toast.error("Failed to delete suite");
    }
  }

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Grading Suites</h1>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Suite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Grading Suite</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Core Behaviors" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tests for core agent behaviors..." />
                </div>
                <Button onClick={handleCreate} disabled={!name.trim()}>
                  Create Suite
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SlideUp>

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading suites...</div>
      ) : suites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No grading suites yet. Create one to start validating your agent.
        </div>
      ) : (
        <StaggerChildren className="space-y-3">
          {suites.map((suite) => (
            <motion.div key={suite.id} variants={staggerItem}>
              <SuiteCard agentId={agentId} suite={suite} onDelete={handleDelete} />
            </motion.div>
          ))}
        </StaggerChildren>
      )}
    </div>
  );
}
