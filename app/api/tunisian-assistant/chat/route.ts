import { NextResponse } from "next/server";
import { runRagPipeline } from "@/lib/ai/orchestrator";

type Body = {
  message?: string;
  language?: "en" | "fr" | "ar" | "darija";
  workspaceId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const language = body.language ?? "darija";
  const message = body.message ?? "";
  const workspaceId = body.workspaceId ?? "workspace-default";

  const result = await runRagPipeline({
    workspaceId,
    message,
    language,
    mode: "tunisian-assistant"
  });

  return NextResponse.json({
    answer: result.reply,
    meta: {
      language,
      source: "tunisian-local-mock",
      provider: result.provider,
      model: result.model,
      context: result.context,
      trace: result.trace
    },
    architecture: "RAG"
  });
}
