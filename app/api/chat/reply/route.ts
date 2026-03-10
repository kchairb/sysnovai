import { NextResponse } from "next/server";
import { runRagPipeline } from "@/lib/ai/orchestrator";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { appendMessage } from "@/lib/server/chat-store";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { type SysnovaLanguage, type SysnovaMode } from "@/lib/ai/types";

type Body = {
  prompt?: string;
  language?: SysnovaLanguage;
  mode?: SysnovaMode;
  workspaceId?: string;
  conversationId?: string;
};

export async function POST(request: Request) {
  try {
    const rateLimited = applyRateLimit(request, {
      bucket: "chat:reply",
      limit: 60,
      windowMs: 60_000
    });
    if (rateLimited) return rateLimited;

    if (authEnabled()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    const body = (await request.json()) as Body;
    const language = body.language ?? "darija";
    const mode = body.mode ?? "general";
    const prompt = body.prompt ?? "No prompt provided";
    const workspaceId = body.workspaceId ?? "workspace-default";
    const conversationId = body.conversationId;

    if (conversationId) {
      await appendMessage(
        conversationId,
        {
          role: "user",
          content: prompt
        },
        workspaceId
      );
    }

    const result = await runRagPipeline({
      workspaceId,
      message: prompt,
      language,
      mode
    });

    if (conversationId) {
      await appendMessage(
        conversationId,
        {
          role: "assistant",
          content: result.reply
        },
        workspaceId
      );
    }

    return NextResponse.json({
      reply: result.reply,
      meta: {
        language,
        mode,
        provider: result.provider,
        model: result.model,
        fallbackUsed: result.fallbackUsed,
        context: result.context,
        promptPreview: result.promptPreview,
        trace: result.trace
      },
      architecture: "RAG"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate reply";
    const status = message.includes("does not belong to workspace") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
