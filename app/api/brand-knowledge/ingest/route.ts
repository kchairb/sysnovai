import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ingestBrandUrls } from "@/lib/server/brand-ingest";
import { getBrandProfile } from "@/lib/server/brand-profile";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type IngestBody = {
  workspaceId?: string;
  urls?: string[] | string;
  crawlSite?: boolean;
  maxPagesPerSite?: number;
  crawlStrategy?: "balanced" | "products-first" | "support-first";
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

    const results = await ingestBrandUrls({
      workspaceId,
      urls,
      crawlSite: Boolean(body.crawlSite),
      maxPagesPerSite: Number(body.maxPagesPerSite ?? 10),
      crawlStrategy:
        body.crawlStrategy === "products-first" || body.crawlStrategy === "support-first"
          ? body.crawlStrategy
          : "balanced",
      brandName: (await getBrandProfile(workspaceId).catch(() => null))?.brandName
    });
    const successCount = results.filter((row) => row.ok).length;
    const totals = results.reduce(
      (sum, row) => {
        sum.pagesCrawled += row.pagesCrawled ?? 0;
        sum.entriesCreated += row.entriesCreated ?? 0;
        sum.entriesUpdated += row.entriesUpdated ?? 0;
        sum.entriesSkipped += row.entriesSkipped ?? 0;
        sum.productsCreated += row.productsCreated ?? 0;
        sum.productsUpdated += row.productsUpdated ?? 0;
        return sum;
      },
      {
        pagesCrawled: 0,
        entriesCreated: 0,
        entriesUpdated: 0,
        entriesSkipped: 0,
        productsCreated: 0,
        productsUpdated: 0
      }
    );
    return NextResponse.json({
      ok: true,
      workspaceId,
      successCount,
      failedCount: results.length - successCount,
      totals,
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ingest links.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
