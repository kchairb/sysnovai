import { NextResponse } from "next/server";

export async function GET() {
  const provider = process.env.SYSNOVA_LLM_PROVIDER ?? "mock";

  if (provider !== "gemini") {
    return NextResponse.json({
      provider,
      models: [],
      note: "Model listing is implemented for Gemini only."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        provider,
        models: [],
        error: "GEMINI_API_KEY is not configured"
      },
      { status: 400 }
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      {
        provider,
        models: [],
        error: `Failed to list Gemini models (${response.status}): ${errorText}`
      },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as {
    models?: Array<{
      name?: string;
      displayName?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  const models =
    payload.models
      ?.filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
      .map((model) => ({
        id: model.name?.replace("models/", "") ?? "",
        displayName: model.displayName ?? ""
      })) ?? [];

  return NextResponse.json({
    provider,
    models
  });
}
