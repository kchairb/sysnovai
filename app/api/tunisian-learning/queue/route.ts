import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import {
  createLearningCandidate,
  listLearningCandidates
} from "@/lib/server/tunisian-learning";

type CandidateLanguage = "darija" | "ar" | "fr" | "en";

type CreateBody = {
  workspaceId?: string;
  phrase?: string;
  language?: CandidateLanguage;
  source?: string;
  metadata?: Record<string, unknown>;
};

export async function GET(request: Request) {
  if (authEnabled()) {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId")?.trim() || "workspace-default";
  const status = (url.searchParams.get("status")?.trim().toLowerCase() || "pending") as
    | "pending"
    | "approved"
    | "rejected"
    | "all";
  const limit = Number(url.searchParams.get("limit") ?? 50);

  const candidates = await listLearningCandidates({
    workspaceId,
    status: ["pending", "approved", "rejected", "all"].includes(status) ? status : "pending",
    limit
  });

  return NextResponse.json({ candidates });
}

export async function POST(request: Request) {
  const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
  if (authEnabled() && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateBody;
  const workspaceId = body.workspaceId?.trim() || "workspace-default";
  const phrase = body.phrase?.trim() || "";
  const language = body.language ?? "darija";
  if (!phrase) {
    return NextResponse.json({ error: "Phrase is required." }, { status: 400 });
  }
  if (!["darija", "ar", "fr", "en"].includes(language)) {
    return NextResponse.json({ error: "Invalid language." }, { status: 400 });
  }

  const candidate = await createLearningCandidate({
    workspaceId,
    phrase,
    language,
    source: body.source?.trim() || "manual",
    submittedBy: user?.email ?? null,
    metadata: body.metadata ?? null
  });

  return NextResponse.json({ candidate }, { status: 201 });
}
