import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import {
  getProviderHealthSnapshot,
  getWorkspaceProviderBadge,
  getWorkspaceProviderTrend
} from "@/lib/server/provider-health";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

export async function GET(request: Request) {
  if (authEnabled()) {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") ?? "workspace-default";
  const range = searchParams.get("range") ?? "24h";
  const sinceMs =
    range === "1h"
      ? 60 * 60 * 1000
      : range === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

  if (hasDatabaseUrl()) {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await ensureWorkspaceForRequest(user, workspaceId);
  }

  return NextResponse.json({
    workspaceId,
    badge: getWorkspaceProviderBadge(workspaceId),
    providers: getProviderHealthSnapshot(),
    trend: await getWorkspaceProviderTrend(workspaceId, 64, { sinceMs })
  });
}
