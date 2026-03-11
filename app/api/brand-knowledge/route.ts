import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import {
  createBrandKnowledgeEntry,
  listBrandKnowledgeEntries
} from "@/lib/server/brand-knowledge";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type CreateBody = {
  workspaceId?: string;
  category?: string;
  title?: string;
  content?: string;
  tags?: unknown;
};

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
    const category = searchParams.get("category")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const includeInactive = searchParams.get("includeInactive") === "1";
    const limit = Number(searchParams.get("limit") ?? 200);

    if (hasDatabaseUrl()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const entries = await listBrandKnowledgeEntries({
      workspaceId,
      category,
      search,
      includeInactive,
      limit
    });
    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load brand knowledge.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const entry = await createBrandKnowledgeEntry({
      workspaceId,
      category: body.category ?? "brand",
      title: body.title ?? "",
      content: body.content ?? "",
      tags: body.tags
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create brand knowledge.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
