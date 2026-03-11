import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import {
  deleteBrandKnowledgeEntry,
  updateBrandKnowledgeEntry
} from "@/lib/server/brand-knowledge";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type UpdateBody = {
  workspaceId?: string;
  brandId?: string;
  category?: string;
  title?: string;
  content?: string;
  tags?: unknown;
  isActive?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { entryId } = await params;
    const body = (await request.json().catch(() => ({}))) as UpdateBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    const brandId = body.brandId?.trim() || undefined;
    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }
    const entry = await updateBrandKnowledgeEntry({
      id: entryId,
      workspaceId,
      brandId,
      category: body.category,
      title: body.title,
      content: body.content,
      tags: body.tags,
      isActive: body.isActive
    });
    return NextResponse.json({ entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update brand knowledge.";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId")?.trim() || "workspace-default";
    const brandId = searchParams.get("brandId")?.trim() || undefined;
    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }
    const { entryId } = await params;
    await deleteBrandKnowledgeEntry({ id: entryId, workspaceId, brandId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete brand knowledge.";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
