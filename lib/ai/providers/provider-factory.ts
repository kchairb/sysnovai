import { GeminiProvider } from "@/lib/ai/providers/gemini-provider";
import { GroqProvider } from "@/lib/ai/providers/groq-provider";
import { MockLlmProvider } from "@/lib/ai/providers/mock-provider";
import { OpenAiProvider } from "@/lib/ai/providers/openai-provider";
import { OpenRouterProvider } from "@/lib/ai/providers/openrouter-provider";
import { type LlmProvider, type LlmProviderName } from "@/lib/ai/types";

const providerNames: LlmProviderName[] = ["gemini", "openai", "groq", "openrouter", "mock"];

export function parseProviderName(value?: string | null): LlmProviderName | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  return providerNames.includes(normalized as LlmProviderName)
    ? (normalized as LlmProviderName)
    : undefined;
}

function createProvider(name: string): LlmProvider {
  switch (name) {
    case "gemini":
      return new GeminiProvider();
    case "openai":
      return new OpenAiProvider();
    case "groq":
      return new GroqProvider();
    case "openrouter":
      return new OpenRouterProvider();
    case "mock":
    default:
      return new MockLlmProvider();
  }
}

export function getPrimaryProvider(): LlmProvider {
  const provider = parseProviderName(process.env.SYSNOVA_LLM_PROVIDER) ?? "mock";
  return createProvider(provider);
}

export function getProviderChain(preferredProvider?: LlmProviderName): LlmProvider[] {
  const envPrimary = parseProviderName(process.env.SYSNOVA_LLM_PROVIDER) ?? "mock";
  const envSecondary = parseProviderName(process.env.SYSNOVA_LLM_SECONDARY_PROVIDER);

  const orderedNames: LlmProviderName[] = [];
  const pushProvider = (name?: LlmProviderName) => {
    if (!name || orderedNames.includes(name)) return;
    orderedNames.push(name);
  };

  pushProvider(preferredProvider);
  pushProvider(envPrimary);
  if (envSecondary && envSecondary !== "mock") {
    pushProvider(envSecondary);
  }

  if (!orderedNames.length || orderedNames[0] === "mock") {
    return [new MockLlmProvider()];
  }

  const chain: LlmProvider[] = orderedNames.map((name) => createProvider(name));
  chain.push(new MockLlmProvider());
  return chain;
}
