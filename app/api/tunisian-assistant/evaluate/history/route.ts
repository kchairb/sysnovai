import { NextResponse } from "next/server";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";

export async function GET(request: Request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ runs: [] });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId")?.trim() || "workspace-default";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 50);

  const runs = await getPrisma().tunisianEvaluationRun.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return NextResponse.json({
    runs: runs.map((run) => ({
      id: run.id,
      workspaceId: run.workspaceId,
      averageScore: run.averageScore,
      sampleCount: run.sampleCount,
      createdAt: run.createdAt.toISOString()
    }))
  });
}
