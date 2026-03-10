import { type LlmGenerateInput, type LlmGenerateOutput, type LlmProvider } from "@/lib/ai/types";

type GroqChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export class GroqProvider implements LlmProvider {
  name = "groq";
  model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const startedAt = Date.now();
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        messages: [
          { role: "system", content: input.prompt.system },
          { role: "user", content: input.prompt.user }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as GroqChatCompletionsResponse;
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("Groq response did not contain text output");
    }

    return {
      text,
      provider: this.name,
      model: this.model,
      latencyMs: Date.now() - startedAt
    };
  }
}
