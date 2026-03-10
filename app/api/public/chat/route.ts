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

  await appendPublicChatLog({
    domain,
    assistantId: assistant.id,
    assistantName: assistant.name,
    prompt,
    reply: result.reply,
    language,
    provider: result.provider,
    model: result.model,
    lead: {
      name: body.lead?.name?.trim() || undefined,
      phone: body.lead?.phone?.trim() || undefined
    }
  });

  return NextResponse.json(
    {
      reply: result.reply,
      assistant: assistant.name,
      meta: {
        language,
        provider: result.provider,
        model: result.model
      }
    },
    { headers: corsHeaders(origin) }
  );
}
