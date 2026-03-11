import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/server/db";
import { cleanupInvalidAutofillProducts } from "@/lib/server/product-store";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type CleanupBody = {
  workspaceId?: string;
  brandId?: string;
  dryRun?: boolean;
  limit?: number;
};

export async function POST(request: Request) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CleanupBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    const brandId = body.brandId?.trim() || undefined;
    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const report = await cleanupInvalidAutofillProducts({
      workspaceId,
      brandId,
      dryRun: body.dryRun,
      limit: Number(body.limit ?? 600)
    });
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clean invalid products.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
