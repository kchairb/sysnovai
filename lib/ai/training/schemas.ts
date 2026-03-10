import { type SysnovaLanguage, type SysnovaMode } from "@/lib/ai/types";

export type TrainingTaskType =
  | "continued-pretraining"
  | "instruction-finetuning"
  | "translation"
  | "local-qna";

export type TunisianScriptType = "latin-darija" | "arabic-script" | "french" | "english" | "mixed";

export interface TrainingExample {
  id: string;
  workspaceId?: string;
  taskType: TrainingTaskType;
  mode: SysnovaMode;
  inputLanguage: SysnovaLanguage | "mixed";
  outputLanguage: SysnovaLanguage | "mixed";
  prompt: string;
  response: string;
  languageProfile: {
    scriptType: TunisianScriptType;
    codeSwitching: boolean;
    dialectRegion?: "north" | "coastal" | "south" | "mixed";
  };
  context?: {
    faqIds?: string[];
    policyIds?: string[];
    productIds?: string[];
    docIds?: string[];
  };
  quality: {
    source: "human" | "synthetic" | "production-feedback";
    reviewerId?: string;
    approved: boolean;
    score?: number;
  };
  safety: {
    piiRedacted: boolean;
    sensitiveDomain: boolean;
    license: "internal" | "customer-consented" | "public";
  };
  metadata: {
    createdAt: string;
    tags: string[];
    domain: "support" | "sales" | "marketing" | "admin" | "general";
  };
}

export interface TrainingDatasetManifest {
  datasetId: string;
  version: string;
  description: string;
  languages: Array<SysnovaLanguage | "mixed">;
  tasks: TrainingTaskType[];
  totalExamples: number;
  byScriptType: Record<TunisianScriptType, number>;
  codeSwitchedExamples: number;
  trainSplit: number;
  valSplit: number;
  testSplit: number;
  createdAt: string;
}
