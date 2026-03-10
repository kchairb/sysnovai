import { type LlmGenerateInput, type LlmGenerateOutput, type LlmProvider } from "@/lib/ai/types";

type ChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export class OpenAiProvider implements LlmProvider {
  name = "openai";
  model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const startedAt = Date.now();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as ChatCompletionsResponse;
    const text = payload.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("OpenAI response did not contain text output");
    }

    return {
      text,
      provider: this.name,
      model: this.model,
      latencyMs: Date.now() - startedAt
    };
  }
}
