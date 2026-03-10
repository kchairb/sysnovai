import { NextResponse } from "next/server";

function isConfigured(secret: string | undefined): boolean {
  if (!secret) return false;
  const normalized = secret.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith("your_")) return false;
  return true;
}

export async function GET() {
  const provider = process.env.SYSNOVA_LLM_PROVIDER ?? "mock";
  const model =
    provider === "gemini"
      ? process.env.GEMINI_MODEL ?? "gemini-1.5-flash"
      : provider === "groq"
        ? process.env.GROQ_MODEL ?? "llama-3.1-8b-instant"
      : provider === "openrouter"
        ? process.env.OPENROUTER_MODEL ?? "stepfun/step-3.5-flash:free"
      : process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const hasOpenAiKey = isConfigured(process.env.OPENAI_API_KEY);
  const hasGeminiKey = isConfigured(process.env.GEMINI_API_KEY);
  const hasGroqKey = isConfigured(process.env.GROQ_API_KEY);
  const hasOpenRouterKey = isConfigured(process.env.OPENROUTER_API_KEY);
  const hasProviderKey =
    provider === "openai"
      ? hasOpenAiKey
      : provider === "gemini"
        ? hasGeminiKey
        : provider === "groq"
          ? hasGroqKey
          : provider === "openrouter"
            ? hasOpenRouterKey
          : true;

  return NextResponse.json({
    provider,
    model,
    hasOpenAiKey,
    hasGeminiKey,
    hasGroqKey,
    hasOpenRouterKey,
    hasProviderKey
  });
}
