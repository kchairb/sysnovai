import { type LlmGenerateInput, type LlmGenerateOutput, type LlmProvider } from "@/lib/ai/types";

type OpenRouterChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export class OpenRouterProvider implements LlmProvider {
  name = "openrouter";
  model = process.env.OPENROUTER_MODEL ?? "stepfun/step-3.5-flash:free";

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const startedAt = Date.now();
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "Sysnova AI"
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
      throw new Error(`OpenRouter request failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as OpenRouterChatCompletionsResponse;
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("OpenRouter response did not contain text output");
    }

    return {
      text,
      provider: this.name,
      model: this.model,
      latencyMs: Date.now() - startedAt
    };
  }
}
