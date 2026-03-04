import { type CollectedEvents } from "@/lib/pi-mono/event-collector";
import { type CriterionConfig } from "@/lib/firebase/firestore";

export interface CriterionResult {
  criterionId: string;
  criterionType: string;
  passed: boolean;
  score: number;
  message: string;
}

export interface CriterionEvaluator {
  type: string;
  evaluate(
    config: CriterionConfig["config"],
    events: CollectedEvents
  ): Promise<CriterionResult>;
}

export interface GradingProgress {
  caseIndex: number;
  totalCases: number;
  caseName: string;
  status: "running" | "passed" | "failed";
  score?: number;
}
