import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import {
  getSettingsStore,
  isSettingsSection,
  type SettingsSection,
  updateSettingsSection
} from "@/lib/server/settings-store";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type UpdateBody = {
  section?: string;
  data?: unknown;
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
    const workspaceId = searchParams.get("workspaceId") ?? "workspace-default";
    if (hasDatabaseUrl()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const settings = await getSettingsStore(workspaceId);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (authEnabled()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") ?? "workspace-default";
    if (hasDatabaseUrl()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      await ensureWorkspaceForRequest(user, workspaceId);
    }
    const body = (await request.json()) as UpdateBody;
    if (!body.section || !isSettingsSection(body.section)) {
      return NextResponse.json({ error: "Invalid settings section." }, { status: 400 });
    }

    if (body.section === "activeSessions") {
      if (!Array.isArray(body.data)) {
        return NextResponse.json({ error: "activeSessions payload must be an array." }, { status: 400 });
      }
    } else if (typeof body.data !== "object" || body.data === null || Array.isArray(body.data)) {
      return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
    }

    const settings = await updateSettingsSection(
      body.section as SettingsSection,
      body.data,
      workspaceId
    );
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
