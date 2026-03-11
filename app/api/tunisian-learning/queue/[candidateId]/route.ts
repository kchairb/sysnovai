import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { reviewLearningCandidate } from "@/lib/server/tunisian-learning";

type ReviewBody = {
  action?: "approve" | "reject";
  reviewNotes?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
  if (authEnabled() && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidateId } = await params;
  if (!candidateId) {
    return NextResponse.json({ error: "Candidate id is required." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as ReviewBody;
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  try {
    const candidate = await reviewLearningCandidate({
      id: candidateId,
      action: body.action,
      reviewNotes: body.reviewNotes,
      reviewedBy: user?.email ?? null
    });
    return NextResponse.json({ candidate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to review candidate";
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
