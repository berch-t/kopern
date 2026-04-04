"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useDictionary } from "@/providers/LocaleProvider";

export interface TestCase {
  name: string;
  input: string;
  expected: string;
}

interface TestCaseBuilderProps {
  cases: TestCase[];
  onChange: (cases: TestCase[]) => void;
  maxCases?: number;
}

export function TestCaseBuilder({ cases, onChange, maxCases = 5 }: TestCaseBuilderProps) {
  const t = useDictionary();
  const g = t.grader;

  const addCase = () => {
    if (cases.length >= maxCases) return;
    onChange([...cases, { name: `Test ${cases.length + 1}`, input: "", expected: "" }]);
  };

  const removeCase = (index: number) => {
    onChange(cases.filter((_, i) => i !== index));
  };

  const updateCase = (index: number, field: keyof TestCase, value: string) => {
    const updated = [...cases];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {cases.map((tc, i) => (
        <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={tc.name}
              onChange={(e) => updateCase(i, "name", e.target.value)}
              placeholder={g.testCaseName}
              className="flex-1 h-8 text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => removeCase(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={tc.input}
            onChange={(e) => updateCase(i, "input", e.target.value)}
            placeholder={g.testCaseInput}
            rows={2}
            className="text-sm resize-none"
          />
          <Textarea
            value={tc.expected}
            onChange={(e) => updateCase(i, "expected", e.target.value)}
            placeholder={g.testCaseExpected}
            rows={2}
            className="text-sm resize-none"
          />
        </div>
      ))}

      {cases.length < maxCases && (
        <Button variant="outline" size="sm" onClick={addCase} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {g.addTestCaseBtn} ({cases.length}/{maxCases})
        </Button>
      )}
    </div>
  );
}
