import { buildPromptTemplate, buildRagPrompt } from "@/lib/ai/prompting";
import { addTraceEvent, createTrace, flushTrace } from "@/lib/ai/observability";
import { MockLlmProvider } from "@/lib/ai/providers/mock-provider";
import { getProviderChain } from "@/lib/ai/providers/provider-factory";
import { retrieveContext } from "@/lib/ai/retrieval";
import { type LlmGenerateOutput, type LlmProvider, type RagRequest, type RagResult } from "@/lib/ai/types";
import {
  isProviderCoolingDown,
  recordProviderFailure,
  recordProviderSuccess,
  recordWorkspaceProviderEvent
} from "@/lib/server/provider-health";

const PROVIDER_TIMEOUT_MS = Number(process.env.SYSNOVA_LLM_TIMEOUT_MS ?? 8000);
const PROVIDER_RETRIES = Number(process.env.SYSNOVA_LLM_RETRIES ?? 1);

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        reject(new Error(`Provider timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

async function runWithRetry(
  provider: LlmProvider,
  input: Parameters<LlmProvider["generate"]>[0],
  retries: number,
  timeoutMs: number,
  onAttempt: (attempt: number, status: "start" | "success" | "error", message?: string, durationMs?: number) => void
): Promise<LlmGenerateOutput> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const startedAt = Date.now();
    onAttempt(attempt, "start");
    try {
      const result = await withTimeout(provider.generate(input), timeoutMs);
      onAttempt(attempt, "success", undefined, Date.now() - startedAt);
      return result;
    } catch (error) {
      lastError = error;
      onAttempt(
        attempt,
        "error",
        error instanceof Error ? error.message : "Unknown provider error",
        Date.now() - startedAt
      );
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Unknown provider failure");
}

export async function runRagPipeline(input: RagRequest): Promise<RagResult> {
  const trace = createTrace();

  // Retrieve context from workspace knowledge, products, and documents.
  const context = await retrieveContext(input);
  addTraceEvent(trace, {
    stage: "retrieve-context",
    status: "success"
  });

  // Build the model prompt with mode, language, and context payload.
  const promptPreview = buildRagPrompt(input, context);
  const promptTemplate = buildPromptTemplate(input, context);
  addTraceEvent(trace, {
    stage: "build-prompt",
    status: "success"
  });

  // Provider chain supports resilience: primary provider -> mock fallback.
  const configuredProviders = getProviderChain(input.preferredProvider);
  const providers = configuredProviders.filter((provider) => {
    if (provider.name === "mock") return true;
    const coolingDown = isProviderCoolingDown(provider.name);
    if (coolingDown) {
      addTraceEvent(trace, {
        stage: "provider-circuit-breaker",
        status: "fallback",
        provider: provider.name,
        model: provider.model,
        message: "Provider skipped due to cooldown"
      });
    }
    return !coolingDown;
  });
  if (!providers.length) {
    providers.push(new MockLlmProvider());
  }
  let generation: LlmGenerateOutput | null = null;
  let lastError: Error | null = null;
  let fallbackUsed = false;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    if (index > 0) {
      addTraceEvent(trace, {
        stage: "fallback",
        status: "fallback",
        provider: provider.name,
        model: provider.model,
        message: `Fallback from ${providers[index - 1].name} to ${provider.name}`
      });
    }

    try {
      generation = await runWithRetry(
        provider,
        {
          prompt: promptTemplate,
          mode: input.mode,
          language: input.language,
          workspaceId: input.workspaceId,
          traceId: trace.traceId
        },
        PROVIDER_RETRIES,
        PROVIDER_TIMEOUT_MS,
        (attempt, status, message, durationMs) => {
          addTraceEvent(trace, {
            stage: "provider-generate",
            status,
            provider: provider.name,
            model: provider.model,
            attempt,
            durationMs,
            message
          });
          if (status === "success") {
            recordProviderSuccess(provider.name, durationMs ?? 0);
          }
          if (status === "error") {
            recordProviderFailure(provider.name, message ?? "Unknown provider error");
          }
        }
      );
      fallbackUsed = index > 0;
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Provider chain failure");
      recordWorkspaceProviderEvent(input.workspaceId, {
        provider: provider.name,
        status: "error",
        errorMessage: lastError.message
      });
    }
  }

  if (!generation) {
    addTraceEvent(trace, {
      stage: "pipeline",
      status: "error",
      message: lastError?.message ?? "No generation available"
    });
    flushTrace(trace);
    throw lastError ?? new Error("All providers failed");
  }

  addTraceEvent(trace, {
    stage: "pipeline",
    status: "success",
    provider: generation.provider,
    model: generation.model,
    durationMs: generation.latencyMs
  });
  recordWorkspaceProviderEvent(input.workspaceId, {
    provider: generation.provider,
    status: fallbackUsed ? "fallback" : "success",
    latencyMs: generation.latencyMs
  });
  flushTrace(trace);

  return {
    reply: generation.text,
    context,
    promptPreview,
    provider: generation.provider,
    model: generation.model,
    trace,
    fallbackUsed
  };
}
