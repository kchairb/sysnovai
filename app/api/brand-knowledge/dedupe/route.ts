import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { dedupeBrandKnowledgeEntries } from "@/lib/server/brand-knowledge";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type DedupeBody = {
  workspaceId?: string;
  brandId?: string;
};

export async function POST(request: Request) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as DedupeBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    const brandId = body.brandId?.trim() || undefined;

    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const result = await dedupeBrandKnowledgeEntries({ workspaceId, brandId });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to deduplicate brand knowledge.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
