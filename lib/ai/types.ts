export type SysnovaLanguage = "en" | "fr" | "ar" | "darija";

export type SysnovaMode =
  | "general"
  | "support"
  | "sales"
  | "marketing"
  | "tunisian-assistant";

export interface RagRequest {
  workspaceId: string;
  message: string;
  language: SysnovaLanguage;
  mode: SysnovaMode;
}

export interface RetrievedContext {
  faqs: string[];
  policies: string[];
  products: string[];
  documents: string[];
}

export interface RagResult {
  reply: string;
  context: RetrievedContext;
  promptPreview: string;
  provider: string;
  model: string;
  trace: RagTrace;
  fallbackUsed: boolean;
}

export interface PromptTemplate {
  system: string;
  user: string;
}

export interface LlmGenerateInput {
  prompt: PromptTemplate;
  mode: SysnovaMode;
  language: SysnovaLanguage;
  workspaceId: string;
  traceId: string;
}

export interface LlmGenerateOutput {
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface LlmProvider {
  name: string;
  model: string;
  generate(input: LlmGenerateInput): Promise<LlmGenerateOutput>;
}

export interface TraceEvent {
  stage: string;
  status: "start" | "success" | "error" | "fallback";
  at: string;
  provider?: string;
  model?: string;
  attempt?: number;
  durationMs?: number;
  message?: string;
}

export interface RagTrace {
  traceId: string;
  events: TraceEvent[];
}
