import { NextResponse } from "next/server";
import { runRagPipeline } from "@/lib/ai/orchestrator";
import { type SysnovaLanguage, type SysnovaMode } from "@/lib/ai/types";
import { appendPublicChatLog } from "@/lib/server/public-chat-log-store";
import {
  findWebsiteAssistantByDomain,
  isAllowedOrigin
} from "@/lib/website-assistants";

type Body = {
  prompt?: string;
  language?: SysnovaLanguage;
  assistantMode?: SysnovaMode;
  brandContext?: string;
  domain?: string;
  lead?: {
    name?: string;
    phone?: string;
  };
};

function parseMode(value: unknown): SysnovaMode {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return ["general", "support", "sales", "marketing", "tunisian-assistant"].includes(normalized)
    ? (normalized as SysnovaMode)
    : "support";
}

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
  const assistantMode = parseMode(body.assistantMode);
  const brandContext = (body.brandContext ?? "").trim().slice(0, 2000);
  const promptWithBrandContext = brandContext
    ? `Brand context:\n${brandContext}\n\nUser message:\n${prompt}`
    : prompt;
  const result = await runRagPipeline({
    workspaceId: assistant.workspaceId,
    message: promptWithBrandContext,
    language,
    mode: assistantMode
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
        mode: assistantMode,
        provider: result.provider,
        model: result.model
      }
    },
    { headers: corsHeaders(origin) }
  );
}
