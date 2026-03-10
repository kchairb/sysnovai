import { type SysnovaLanguage, type SysnovaMode } from "@/lib/ai/types";

export interface EvalCase {
  id: string;
  benchmark: string;
  mode: SysnovaMode;
  inputLanguage: SysnovaLanguage | "mixed";
  expectedOutputLanguage: SysnovaLanguage | "mixed";
  prompt: string;
  referenceAnswer?: string;
  rubric: Array<"grounding" | "fluency" | "local-relevance" | "safety" | "task-completion">;
  focus: Array<
    | "darija-understanding"
    | "language-switching"
    | "support-quality"
    | "business-writing"
    | "tunisia-relevance"
  >;
  weights: {
    grounding: number;
    fluency: number;
    localRelevance: number;
    safety: number;
    taskCompletion: number;
  };
  tags: string[];
}

export interface EvalRunResult {
  runId: string;
  modelName: string;
  modelVersion: string;
  benchmark: string;
  executedAt: string;
  aggregate: {
    grounding: number;
    fluency: number;
    localRelevance: number;
    safety: number;
    taskCompletion: number;
    overall: number;
  };
  strategicMetrics: {
    darijaUnderstanding: number;
    languageSwitching: number;
    supportQuality: number;
    businessWritingQuality: number;
    tunisiaRelevance: number;
  };
  byLanguage: Record<string, number>;
  byMode: Record<string, number>;
  failures: Array<{
    caseId: string;
    reason: string;
    severity: "low" | "medium" | "high";
  }>;
}
