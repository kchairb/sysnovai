import { NextResponse } from "next/server";
import { runRagPipeline } from "@/lib/ai/orchestrator";
import { type SysnovaLanguage } from "@/lib/ai/types";
import { appendPublicChatLog } from "@/lib/server/public-chat-log-store";
import {
  findWebsiteAssistantByDomain,
  isAllowedOrigin
} from "@/lib/website-assistants";

type Body = {
  prompt?: string;
  language?: SysnovaLanguage;
  domain?: string;
  lead?: {
    name?: string;
    phone?: string;
  };
};

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function splitForStreaming(text: string): string[] {
  const chunks = text.match(/\S+\s*/g);
  return chunks?.length ? chunks : [text];
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin)
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const body = (await request.json()) as Body;
  const prompt = (body.prompt ?? "").trim();
  const domain = (body.domain ?? "").trim();

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt is required." },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  if (!domain) {
    return NextResponse.json(
      { error: "Domain is required." },
      { status: 400, headers: corsHeaders(origin) }
    );
  }

  const assistant = findWebsiteAssistantByDomain(domain);
  if (!assistant) {
    return NextResponse.json(
      { error: "Domain is not registered for website assistant access." },
      { status: 403, headers: corsHeaders(origin) }
    );
  }

  if (origin && !isAllowedOrigin(origin, assistant)) {
    return NextResponse.json(
      { error: "Origin is not allowed for this assistant." },
      { status: 403, headers: corsHeaders(origin) }
    );
  }

  const language = body.language ?? assistant.defaultLanguage;
  const result = await runRagPipeline({
    workspaceId: assistant.workspaceId,
    message: prompt,
    language,
    mode: "support"
  });

  const chunks = splitForStreaming(result.reply);
  const encoder = new TextEncoder();
  let accumulated = "";

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        accumulated += chunk;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 16));
      }

      await appendPublicChatLog({
        domain,
        assistantId: assistant.id,
        assistantName: assistant.name,
        prompt,
        reply: accumulated,
        language,
        provider: result.provider,
        model: result.model,
        lead: {
          name: body.lead?.name?.trim() || undefined,
          phone: body.lead?.phone?.trim() || undefined
        }
      });

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            done: true,
            provider: result.provider,
            model: result.model
          })}\n\n`
        )
      );
      controller.close();
    }
  });

  return new NextResponse(stream, {
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
