import { GeminiProvider } from "@/lib/ai/providers/gemini-provider";
import { GroqProvider } from "@/lib/ai/providers/groq-provider";
import { MockLlmProvider } from "@/lib/ai/providers/mock-provider";
import { OpenAiProvider } from "@/lib/ai/providers/openai-provider";
import { OpenRouterProvider } from "@/lib/ai/providers/openrouter-provider";
import { type LlmProvider } from "@/lib/ai/types";

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
  const provider = process.env.SYSNOVA_LLM_PROVIDER ?? "mock";
  return createProvider(provider);
}

export function getProviderChain(): LlmProvider[] {
  const primary = getPrimaryProvider();
  if (primary.name === "mock") {
    return [primary];
  }

  const secondaryName = process.env.SYSNOVA_LLM_SECONDARY_PROVIDER?.trim().toLowerCase();
  const chain: LlmProvider[] = [primary];
  if (secondaryName && secondaryName !== primary.name && secondaryName !== "mock") {
    chain.push(createProvider(secondaryName));
  }

  chain.push(new MockLlmProvider());
  return chain;
}
