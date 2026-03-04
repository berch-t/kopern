"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type CriterionConfig } from "@/lib/firebase/firestore";
import { CriteriaForm } from "./CriteriaForm";

interface CaseEditorProps {
  initialData?: {
    name: string;
    inputPrompt: string;
    expectedBehavior: string;
    criteria: CriterionConfig[];
  };
  onSave: (data: {
    name: string;
    inputPrompt: string;
    expectedBehavior: string;
    criteria: CriterionConfig[];
  }) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function CaseEditor({ initialData, onSave, onCancel, saving }: CaseEditorProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [inputPrompt, setInputPrompt] = useState(initialData?.inputPrompt ?? "");
  const [expectedBehavior, setExpectedBehavior] = useState(initialData?.expectedBehavior ?? "");
  const [criteria, setCriteria] = useState<CriterionConfig[]>(initialData?.criteria ?? []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Case Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Test case name" />
      </div>

      <div className="space-y-2">
        <Label>Input Prompt</Label>
        <Textarea
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="The message to send to the agent..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Expected Behavior</Label>
        <Textarea
          value={expectedBehavior}
          onChange={(e) => setExpectedBehavior(e.target.value)}
          placeholder="Human-readable description of what the agent should do..."
          className="min-h-[80px]"
        />
      </div>

      <CriteriaForm criteria={criteria} onChange={setCriteria} />

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={() => onSave({ name, inputPrompt, expectedBehavior, criteria })}
          disabled={saving || !name.trim() || !inputPrompt.trim()}
        >
          {saving ? "Saving..." : "Save Case"}
        </Button>
      </div>
    </div>
  );
}
