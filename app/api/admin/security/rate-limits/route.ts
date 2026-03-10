import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";

function getOwnerEmail() {
  return (process.env.SYSNOVA_DEFAULT_USER_EMAIL ?? "owner@sysnova.ai").trim().toLowerCase();
}

async function requireAdmin(request: Request) {
  if (!authEnabled()) return { ok: true as const };
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
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ summary: { totalEvents: 0 }, topBuckets: [], topClients: [] });
  }

  const { searchParams } = new URL(request.url);
  const windowMinutes = Math.min(Math.max(Number(searchParams.get("windowMinutes") ?? 60), 5), 720);
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const rows = await getPrisma().rateLimitEvent.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 4000
  });

  const byBucket = new Map<string, number>();
  const byClient = new Map<string, number>();
  for (const row of rows) {
    byBucket.set(row.bucket, (byBucket.get(row.bucket) ?? 0) + 1);
    byClient.set(row.clientKey, (byClient.get(row.clientKey) ?? 0) + 1);
  }

  const topBuckets = Array.from(byBucket.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const topClients = Array.from(byClient.entries())
    .map(([clientKey, count]) => ({ clientKey, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    windowMinutes,
    summary: {
      totalEvents: rows.length
    },
    topBuckets,
    topClients
  });
}
