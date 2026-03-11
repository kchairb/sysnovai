import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { createBrandProfile, listBrandProfiles } from "@/lib/server/brand-profile";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type CreateBody = {
  workspaceId?: string;
  brandName?: string;
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
    if (hasDatabaseUrl()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      await ensureWorkspaceForRequest(user, workspaceId);
    }
    const brands = await listBrandProfiles(workspaceId);
    return NextResponse.json({ brands });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list brands.";
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
    const brandName = body.brandName?.trim() || "New Brand";
    const brand = await createBrandProfile({ workspaceExternalId: workspaceId, brandName });
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create brand.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
