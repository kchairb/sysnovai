import { NextResponse } from "next/server";
import {
  authEnabled,
  getAuthenticatedUserFromRequest,
  isDatabaseConnectionError
} from "@/lib/server/auth";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

export async function GET(request: Request) {
  if (!authEnabled()) {
    return NextResponse.json({
      authenticated: false,
      user: {
        id: "demo-user",
        email: "owner@sysnova.ai",
        name: "Sysnova Demo"
      },
      workspace: {
        externalId: "workspace-default",
        name: "Sysnova Workspace",
        role: "owner"
      }
    });
  }

  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? "workspace-default";
    const { workspace } = await ensureWorkspaceForRequest(user, workspaceId);

    return NextResponse.json({
      authenticated: true,
      user,
      workspace: {
        externalId: workspace.externalId,
        name: workspace.name,
        role: "owner"
      }
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { authenticated: false, error: "Database is temporarily unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { authenticated: false, error: "Failed to load auth context." },
      { status: 500 }
    );
  }
}
