"use client";

import { use, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument, useCollection } from "@/hooks/useFirestore";
import {
  gradingSuiteDoc,
  gradingCasesCollection,
  type GradingSuiteDoc,
  type GradingCaseDoc,
} from "@/lib/firebase/firestore";
import { createGradingCase, updateGradingCase, deleteGradingCase } from "@/actions/grading-cases";
import { duplicateGradingSuite } from "@/actions/grading-suites";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Play, Pencil, Copy } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { CaseEditor } from "@/components/grading/CaseEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LocalizedLink } from "@/components/LocalizedLink";

export default function SuiteDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; suiteId: string }>;
}) {
  const { agentId, suiteId } = use(params);
  const { user } = useAuth();
  const { data: suite } = useDocument<GradingSuiteDoc>(
    user ? gradingSuiteDoc(user.uid, agentId, suiteId) : null
  );
  const { data: cases, loading } = useCollection<GradingCaseDoc>(
    user ? gradingCasesCollection(user.uid, agentId, suiteId) : null,
    "orderIndex",
    "asc"
  );
  const router = useLocalizedRouter();
  const [showNew, setShowNew] = useState(false);
  const [editingCase, setEditingCase] = useState<GradingCaseDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  async function handleCreateCase(data: {
    name: string;
    inputPrompt: string;
    expectedBehavior: string;
    criteria: GradingCaseDoc["criteria"];
  }) {
    if (!user) return;
    setSaving(true);
    try {
      await createGradingCase(user.uid, agentId, suiteId, {
        ...data,
        orderIndex: cases.length,
      });
      toast.success("Test case created");
      setShowNew(false);
    } catch {
      toast.error("Failed to create case");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCase(data: {
    name: string;
    inputPrompt: string;
    expectedBehavior: string;
    criteria: GradingCaseDoc["criteria"];
  }) {
    if (!user || !editingCase) return;
    setSaving(true);
    try {
      await updateGradingCase(user.uid, agentId, suiteId, editingCase.id, data);
      toast.success("Test case updated");
      setEditingCase(null);
    } catch {
      toast.error("Failed to update case");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCase(caseId: string) {
    if (!user) return;
    try {
      await deleteGradingCase(user.uid, agentId, suiteId, caseId);
      toast.success("Case deleted");
    } catch {
      toast.error("Failed to delete case");
    }
  }

  async function handleDuplicate() {
    if (!user) return;
    setDuplicating(true);
    try {
      const newSuiteId = await duplicateGradingSuite(user.uid, agentId, suiteId);
      toast.success("Suite duplicated");
      router.push(`/agents/${agentId}/grading/${newSuiteId}`);
    } catch {
      toast.error("Failed to duplicate suite");
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{suite?.name || "Suite"}</h1>
            <p className="text-muted-foreground">{suite?.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDuplicate} disabled={duplicating}>
              <Copy className="mr-2 h-4 w-4" />
              {duplicating ? "Duplicating..." : "Duplicate"}
            </Button>
            <LocalizedLink href={`/agents/${agentId}/grading/${suiteId}/runs`}>
              <Button variant="outline">
                <Play className="mr-2 h-4 w-4" />
                Run Grading
              </Button>
            </LocalizedLink>
            <Dialog open={showNew} onOpenChange={setShowNew}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Case
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>New Test Case</DialogTitle>
                </DialogHeader>
                <CaseEditor
                  onSave={handleCreateCase}
                  onCancel={() => setShowNew(false)}
                  saving={saving}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SlideUp>

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading cases...</div>
      ) : cases.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No test cases yet. Add cases with criteria to validate your agent.
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c, i) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-muted-foreground">#{i + 1}</span>
                  <CardTitle className="text-sm">{c.name}</CardTitle>
                  <Badge variant="outline">{c.criteria.length} criteria</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditingCase(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCase(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2">{c.inputPrompt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingCase} onOpenChange={(open) => !open && setEditingCase(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Test Case</DialogTitle>
          </DialogHeader>
          {editingCase && (
            <CaseEditor
              initialData={{
                name: editingCase.name,
                inputPrompt: editingCase.inputPrompt,
                expectedBehavior: editingCase.expectedBehavior,
                criteria: editingCase.criteria,
              }}
              onSave={handleUpdateCase}
              onCancel={() => setEditingCase(null)}
              saving={saving}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
