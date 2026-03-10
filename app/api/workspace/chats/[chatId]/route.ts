import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { getChatById, getChatMessages } from "@/lib/server/chat-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    if (authEnabled()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const { chatId } = await params;
    const chat = await getChatById(chatId);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (workspaceId && chat.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Chat does not belong to workspace" }, { status: 403 });
    }

    const messages = await getChatMessages(chatId);
    return NextResponse.json({ chat, messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
