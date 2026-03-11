import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/server/db";
import { getBrandProfile, upsertBrandProfile } from "@/lib/server/brand-profile";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type UpdateBody = {
  workspaceId?: string;
  brandName?: string;
  websiteUrl?: string;
  instagram?: string;
  defaultMode?: string;
  context?: string;
};

export async function GET(request: Request) {
  if (authEnabled()) {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId")?.trim() || "workspace-default";
  if (hasDatabaseUrl()) {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureWorkspaceForRequest(user, workspaceId);
  }
  const profile = await getBrandProfile(workspaceId);
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
  if (authEnabled() && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as UpdateBody;
  const workspaceId = body.workspaceId?.trim() || "workspace-default";
  if (hasDatabaseUrl() && user) {
    await ensureWorkspaceForRequest(user, workspaceId);
  }
  const profile = await upsertBrandProfile({
    workspaceExternalId: workspaceId,
    brandName: body.brandName,
    websiteUrl: body.websiteUrl,
    instagram: body.instagram,
    defaultMode: body.defaultMode,
    context: body.context
  });
  return NextResponse.json({ profile });
}
