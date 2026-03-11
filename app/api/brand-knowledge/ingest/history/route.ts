import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { listCrawlRuns } from "@/lib/server/crawl-history";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

export async function GET(request: Request) {
  try {
    if (authEnabled()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId")?.trim() || "workspace-default";
    const limit = Number(searchParams.get("limit") ?? 10);

    if (hasDatabaseUrl()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const runs = await listCrawlRuns({ workspaceId, limit });
    return NextResponse.json({ runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load crawl history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
