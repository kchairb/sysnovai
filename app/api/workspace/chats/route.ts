import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { createWorkspaceChat, listWorkspaceChats } from "@/lib/server/chat-store";
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
  if (hasDatabaseUrl()) {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await ensureWorkspaceForRequest(user, workspaceId);
  }
  const chats = await listWorkspaceChats(workspaceId);
  return NextResponse.json({ chats });
}

export async function POST(request: Request) {
  if (authEnabled()) {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const body = (await request.json()) as {
    workspaceId?: string;
    title?: string;
    mode?: string;
    language?: string;
    tone?: string;
  };
  const workspaceId = body.workspaceId ?? "workspace-default";
  if (hasDatabaseUrl()) {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await ensureWorkspaceForRequest(user, workspaceId);
  }

  const chat = await createWorkspaceChat({
    workspaceId,
    title: body.title,
    mode: body.mode,
    language: body.language,
    tone: body.tone
  });

  return NextResponse.json({ chat });
}
