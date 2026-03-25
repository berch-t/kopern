"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { VerticalTemplate, OnboardingQuestion } from "@/data/vertical-templates";

interface OnboardingQuestionnaireProps {
  template: VerticalTemplate;
  locale: string;
  onComplete: (answers: Record<string, string>) => void;
  onBack: () => void;
}

export function OnboardingQuestionnaire({
  template,
  locale,
  onComplete,
  onBack,
}: OnboardingQuestionnaireProps) {
  const isFr = locale === "fr";
  const questions = template.onboardingQuestions;
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const question = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const isLast = currentStep === questions.length - 1;

  const canProceed = useMemo(() => {
    if (!question) return false;
    const val = answers[question.id]?.trim();
    return question.required ? !!val : true;
  }, [question, answers]);

  function handleNext() {
    if (isLast) {
      onComplete(answers);
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function handlePrev() {
    if (currentStep === 0) {
      onBack();
    } else {
      setCurrentStep((s) => s - 1);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && canProceed && question?.type !== "textarea") {
      e.preventDefault();
      handleNext();
    }
  }

  if (!question) return null;

  const label = isFr ? question.labelFr : question.label;
  const helper = isFr ? question.helperTextFr : question.helperText;
  const placeholder = isFr ? question.placeholderFr : question.placeholder;

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isFr ? "Question" : "Question"} {currentStep + 1}/{questions.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label className="text-lg font-medium">{label}</Label>
            {helper && (
              <p className="text-sm text-muted-foreground">{helper}</p>
            )}
          </div>

          <QuestionInput
            question={question}
            value={answers[question.id] ?? ""}
            placeholder={placeholder}
            locale={locale}
            onChange={(val) =>
              setAnswers((prev) => ({ ...prev, [question.id]: val }))
            }
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={handlePrev}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {currentStep === 0 ? (isFr ? "Retour" : "Back") : (isFr ? "Précédent" : "Previous")}
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          {isLast ? (
            <>
              {isFr ? "Voir l'aperçu" : "See Preview"}
              <Check className="h-4 w-4 ml-1" />
            </>
          ) : (
            <>
              {isFr ? "Suivant" : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>

      {/* Step dots */}
      <div className="flex justify-center gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => {
              // Only allow going back to answered questions
              if (i <= currentStep || answers[q.id]) setCurrentStep(i);
            }}
            className={cn(
              "h-2 rounded-full transition-all duration-200",
              i === currentStep
                ? "w-6 bg-primary"
                : answers[q.id]
                  ? "w-2 bg-primary/40 hover:bg-primary/60"
                  : "w-2 bg-muted-foreground/20"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Individual question input ──────────────────────────────────

function QuestionInput({
  question,
  value,
  placeholder,
  locale,
  onChange,
}: {
  question: OnboardingQuestion;
  value: string;
  placeholder?: string;
  locale: string;
  onChange: (val: string) => void;
}) {
  const isFr = locale === "fr";

  switch (question.type) {
    case "text":
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="text-base"
        />
      );

    case "textarea":
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          rows={4}
          className="text-base resize-none"
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="text-base"
        />
      );

    case "select":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="text-base">
            <SelectValue
              placeholder={isFr ? "Sélectionnez..." : "Select..."}
            />
          </SelectTrigger>
          <SelectContent>
            {question.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {isFr ? opt.labelFr : opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    default:
      return null;
  }
}
