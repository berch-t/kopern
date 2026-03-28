"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { updateAgent } from "@/actions/agents";
import { hydratePrompt } from "@/lib/templates/hydrate";
import { verticalTemplates } from "@/data/vertical-templates";
import type { AgentDoc } from "@/lib/firebase/firestore";
import type { OnboardingQuestion, VerticalTemplate } from "@/data/vertical-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FadeIn } from "@/components/motion/FadeIn";
import { Pencil, Loader2, CheckCircle2, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface OperatorEditFormProps {
  agentId: string;
  agent: AgentDoc;
}

export default function OperatorEditForm({ agentId, agent }: OperatorEditFormProps) {
  const { user } = useAuth();
  const t = useDictionary();
  const locale = useLocale();
  const isFr = locale === "fr";

  const template = agent.templateId
    ? verticalTemplates.find((t) => t.slug === agent.templateId) ?? null
    : null;

  const [answers, setAnswers] = useState<Record<string, string>>(
    agent.templateVariables ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync if agent doc updates externally
  useEffect(() => {
    if (agent.templateVariables) {
      setAnswers(agent.templateVariables);
      setDirty(false);
    }
  }, [agent.templateVariables]);

  if (!template) {
    return (
      <FadeIn>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Settings2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t.operator.editForm.noTemplate}</p>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  function handleChange(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setDirty(true);
  }

  async function handleSave() {
    if (!user || !template) return;
    setSaving(true);
    try {
      const newPrompt = hydratePrompt(template.systemPromptTemplate, answers);
      await updateAgent(user.uid, agentId, {
        systemPrompt: newPrompt,
        templateVariables: answers,
      });
      setDirty(false);
      toast.success(t.operator.editForm.saved);
    } catch {
      toast.error(t.operator.editForm.error);
    } finally {
      setSaving(false);
    }
  }

  const questions = template.onboardingQuestions;

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{t.operator.editForm.title}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">{t.operator.editForm.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id] ?? ""}
              onChange={(v) => handleChange(q.id, v)}
              isFr={isFr}
            />
          ))}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.operator.editForm.saving}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t.operator.editForm.save}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

function QuestionField({
  question,
  value,
  onChange,
  isFr,
}: {
  question: OnboardingQuestion;
  value: string;
  onChange: (value: string) => void;
  isFr: boolean;
}) {
  const label = isFr ? question.labelFr : question.label;
  const helper = isFr ? question.helperTextFr : question.helperText;
  const placeholder = isFr
    ? question.placeholderFr ?? question.placeholder
    : question.placeholder;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {question.required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>

      {question.type === "textarea" ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : question.type === "select" && question.options ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {isFr ? opt.labelFr : opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={question.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}

      {helper && (
        <p className="text-xs text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
