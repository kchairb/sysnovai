import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/server/db";
import { autoFillBrandFromWebsite } from "@/lib/server/brand-ingest";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type AutofillBody = {
  workspaceId?: string;
  websiteUrl?: string;
  maxPages?: number;
};

export async function POST(request: Request) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as AutofillBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    const websiteUrl = body.websiteUrl?.trim() || "";
    if (!websiteUrl) {
      return NextResponse.json({ error: "Website URL is required." }, { status: 400 });
    }

    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const data = await autoFillBrandFromWebsite({
      websiteUrl,
      maxPages: Number(body.maxPages ?? 10)
    });
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to auto-fill brand data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
