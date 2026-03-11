import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ingestBrandUrls } from "@/lib/server/brand-ingest";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type IngestBody = {
  workspaceId?: string;
  urls?: string[] | string;
};

function parseUrls(input: IngestBody["urls"]) {
  if (Array.isArray(input)) {
    return input.map((item) => item.trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    return input
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as IngestBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const urls = parseUrls(body.urls).slice(0, 8);
    if (!urls.length) {
      return NextResponse.json({ error: "At least one URL is required." }, { status: 400 });
    }

    const results = await ingestBrandUrls({ workspaceId, urls });
    const successCount = results.filter((row) => row.ok).length;
    return NextResponse.json({
      ok: true,
      workspaceId,
      successCount,
      failedCount: results.length - successCount,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ingest links.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
