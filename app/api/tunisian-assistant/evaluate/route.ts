import { NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { runRagPipeline } from "@/lib/ai/orchestrator";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";
import { scoreTunisianAnswer, tunisianEvaluationPrompts } from "@/lib/tunisian-ai-quality";

type EvaluateBody = {
  workspaceId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as EvaluateBody;
  const workspaceId = body.workspaceId?.trim() || "workspace-default";
  const results: Array<{
    id: string;
    language: string;
    prompt: string;
    reply: string;
    score: number;
    breakdown: {
      clarity: number;
      safety: number;
      localization: number;
      empathy: number;
      languageFit: number;
    };
  }> = [];

  for (const item of tunisianEvaluationPrompts) {
    const generation = await runRagPipeline({
      workspaceId,
      mode: "tunisian-assistant",
      language: item.language,
      message: item.prompt
    });
    const scored = scoreTunisianAnswer(generation.reply, item.language);
    results.push({
      id: item.id,
      language: item.language,
      prompt: item.prompt,
      reply: generation.reply,
      score: scored.total,
      breakdown: scored.breakdown
    });
  }

  const average =
    results.length > 0
      ? Math.round(results.reduce((sum, row) => sum + row.score, 0) / results.length)
      : 0;

  if (hasDatabaseUrl()) {
    const first = results[0];
    await getPrisma().tunisianEvaluationRun.create({
      data: {
        workspaceId,
        averageScore: average,
        sampleCount: results.length,
        provider: first ? "mixed" : null,
        model: first ? "mixed" : null,
        results: results as unknown as Prisma.InputJsonValue
      }
    });
  }

  return NextResponse.json({
    ok: true,
    workspaceId,
    averageScore: average,
    sampleCount: results.length,
    results
  });
}
