import { type LlmGenerateInput, type LlmGenerateOutput, type LlmProvider } from "@/lib/ai/types";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function normalizeGeminiModelName(model: string): string {
  return model.startsWith("models/") ? model.slice("models/".length) : model;
}

function getGeminiCandidateModels(primaryModel: string): string[] {
  const envCandidates = process.env.GEMINI_MODEL_CANDIDATES
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const defaults = [
    primaryModel,
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro-latest"
  ];

  const source = envCandidates?.length ? [primaryModel, ...envCandidates] : defaults;
  return Array.from(new Set(source.map((model) => normalizeGeminiModelName(model))));
}

function shouldTryNextModel(status: number, errorText: string): boolean {
  const lower = errorText.toLowerCase();
  return (
    status === 404 ||
    status === 429 ||
    status === 503 ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("not found") ||
    lower.includes("not supported for generatecontent")
  );
}

export class GeminiProvider implements LlmProvider {
  name = "gemini";
  model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  async generate(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const startedAt = Date.now();
    const modelsToTry = getGeminiCandidateModels(this.model);
    const modelErrors: string[] = [];

    for (const model of modelsToTry) {
      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
        `?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: input.prompt.system }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: input.prompt.user }]
            }
          ],
          generationConfig: {
            temperature: 0.4
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        modelErrors.push(`${model}: ${response.status}`);
        if (shouldTryNextModel(response.status, errorText)) {
          continue;
        }
        throw new Error(`Gemini request failed (${response.status}) on ${model}: ${errorText}`);
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

      if (!text) {
        throw new Error(`Gemini response did not contain text output for model ${model}`);
      }

      return {
        text,
        provider: this.name,
        model,
        latencyMs: Date.now() - startedAt
      };
    }

    throw new Error(
      `Gemini request failed: no supported model found. Tried models: ${modelErrors.join(", ")}`
    );
  }
}
