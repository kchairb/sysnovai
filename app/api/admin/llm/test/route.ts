import { NextResponse } from "next/server";
import { runRagPipeline } from "@/lib/ai/orchestrator";

function buildHint(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("401") || lower.includes("invalid api key") || lower.includes("incorrect api key")) {
    return "Invalid API key. Rotate key and ensure OPENAI_API_KEY is correct.";
  }
  if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit")) {
    return "Quota or rate limit issue. On free tier, reduce request frequency or wait for limits to reset.";
  }
  if (lower.includes("403") || lower.includes("permission")) {
    return "Permission issue. Verify your key/project permissions and model access.";
  }
  if (lower.includes("model")) {
    if (lower.includes("gemini")) {
      return "Gemini model issue. Set GEMINI_MODEL to a supported value (for example gemini-1.5-flash-latest or gemini-1.5-pro-latest) and verify API availability in your project.";
    }
    if (lower.includes("openrouter")) {
      return "OpenRouter model issue. Set OPENROUTER_MODEL to a valid id (for example stepfun/step-3.5-flash:free).";
    }
    return "Model access issue. Confirm OPENAI_MODEL is enabled for your OpenAI account.";
  }
  if (lower.includes("gemini_api_key") || lower.includes("api key not valid")) {
    return "Invalid Gemini key. Verify GEMINI_API_KEY and key restrictions in Google AI Studio.";
  }
  if (lower.includes("gemini request failed")) {
    return "Gemini request failed. Check GEMINI_MODEL access, API key, and free-tier quota limits.";
  }
  if (lower.includes("groq_api_key") || lower.includes("groq request failed")) {
    return "Groq request failed. Verify GROQ_API_KEY, model access (GROQ_MODEL), and current rate limits.";
  }
  if (lower.includes("openrouter_api_key") || lower.includes("openrouter request failed")) {
    return "OpenRouter request failed. Verify OPENROUTER_API_KEY and model id (OPENROUTER_MODEL).";
  }
  if (lower.includes("timeout")) {
    return "Timeout detected. Increase SYSNOVA_LLM_TIMEOUT_MS or check network stability.";
  }
  return "Check provider key, model access, free-tier quota, and network connectivity.";
}

export async function POST() {
  const startedAt = Date.now();

  try {
    const result = await runRagPipeline({
      workspaceId: "workspace-healthcheck",
      mode: "general",
      language: "en",
      message: "Health check ping for Sysnova AI provider."
    });

    const fallbackUsed = result.trace.events.some((event) => event.status === "fallback");
    const primaryProviderErrors = result.trace.events.filter(
      (event) =>
        event.status === "error" &&
        typeof event.provider === "string" &&
        event.provider !== "mock"
    );
    const latestPrimaryProviderError = primaryProviderErrors[primaryProviderErrors.length - 1];
    const providerErrorMessage = latestPrimaryProviderError?.message;
    const providerErrorSource = latestPrimaryProviderError?.provider ?? null;

    return NextResponse.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      latencyMs: Date.now() - startedAt,
      traceId: result.trace.traceId,
      fallbackUsed,
      diagnostics: {
        providerErrorSource,
        providerError: providerErrorMessage ?? null,
        hint: providerErrorMessage ? buildHint(providerErrorMessage) : null
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Provider test failed",
        latencyMs: Date.now() - startedAt
      },
      { status: 500 }
    );
  }
}
