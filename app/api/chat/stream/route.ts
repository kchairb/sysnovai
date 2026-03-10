import { NextResponse } from "next/server";
import { runRagPipeline } from "@/lib/ai/orchestrator";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { appendMessage } from "@/lib/server/chat-store";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { type LlmProviderName, type SysnovaLanguage, type SysnovaMode } from "@/lib/ai/types";
import { parseProviderName } from "@/lib/ai/providers/provider-factory";

type Body = {
  prompt?: string;
  language?: SysnovaLanguage;
  mode?: SysnovaMode;
  workspaceId?: string;
  conversationId?: string;
  provider?: LlmProviderName | "auto";
};

function splitForStreaming(text: string): string[] {
  const chunks = text.match(/\S+\s*/g);
  return chunks?.length ? chunks : [text];
}

export async function POST(request: Request) {
  try {
    const rateLimited = applyRateLimit(request, {
      bucket: "chat:stream",
      limit: 40,
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
    const preferredProvider =
      body.provider && body.provider !== "auto" ? parseProviderName(body.provider) : undefined;

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
      mode,
      preferredProvider
    });

    const chunks = splitForStreaming(result.reply);
    const encoder = new TextEncoder();
    let accumulated = "";

    const stream = new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          accumulated += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
          await new Promise((resolve) => setTimeout(resolve, 18));
        }

        if (conversationId) {
          await appendMessage(
            conversationId,
            {
              role: "assistant",
              content: accumulated
            },
            workspaceId
          );
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              provider: result.provider,
              model: result.model,
              fallbackUsed: result.fallbackUsed
            })}\n\n`
          )
        );
        controller.close();
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stream response";
    const status = message.includes("does not belong to workspace") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
