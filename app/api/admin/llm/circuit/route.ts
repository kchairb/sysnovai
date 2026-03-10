import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import {
  getProviderHealthSnapshot,
  resetProviderCircuit
} from "@/lib/server/provider-health";

function getOwnerEmail() {
  return (process.env.SYSNOVA_DEFAULT_USER_EMAIL ?? "owner@sysnova.ai").trim().toLowerCase();
}

async function requireAdmin(request: Request) {
  if (!authEnabled()) {
    return { ok: true as const };
  }
  const user = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.email.trim().toLowerCase() !== getOwnerEmail()) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const };
}

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (!access.ok) return access.response;
  return NextResponse.json({
    providers: getProviderHealthSnapshot()
  });
}

export async function POST(request: Request) {
  const access = await requireAdmin(request);
  if (!access.ok) return access.response;

  const body = (await request.json().catch(() => ({}))) as { provider?: string; action?: string };
  if ((body.action ?? "reset") !== "reset") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const provider = body.provider?.trim();
  resetProviderCircuit(provider || undefined);

  return NextResponse.json({
    ok: true,
    providers: getProviderHealthSnapshot()
  });
}
