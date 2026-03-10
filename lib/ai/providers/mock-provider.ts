import { type LlmGenerateInput, type LlmGenerateOutput, type LlmProvider } from "@/lib/ai/types";

export class MockLlmProvider implements LlmProvider {
  name = "mock";
  model = "mock-llm-v2";

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const startedAt = Date.now();
    const prefix =
      input.mode === "tunisian-assistant"
        ? "Local assistant:"
        : input.mode === "support"
          ? "Support reply:"
          : input.mode === "sales"
            ? "Sales reply:"
            : input.mode === "marketing"
              ? "Marketing draft:"
              : "General reply:";

    const messageLine =
      input.prompt.user
        .split("\n")
        .find((line) => line.startsWith("Message:"))
        ?.replace("Message:", "")
        .trim() ?? "No message";

    return {
      text: `${prefix} ${messageLine} (generated with RAG context and multilingual rules).`,
      provider: this.name,
      model: this.model,
      latencyMs: Date.now() - startedAt
    };
  }
}
