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
    return NextResponse.json({ alerts: [] });
  }

  const { searchParams } = new URL(request.url);
  const windowMinutes = Math.min(Math.max(Number(searchParams.get("windowMinutes") ?? 15), 5), 180);
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const prisma = getPrisma();

  const [providerEvents, rateLimitEvents] = await Promise.all([
    prisma.providerHealthEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 1000
    }),
    prisma.rateLimitEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 1000
    })
  ]);

  const alerts: Array<{
    id: string;
    type: "provider" | "rate-limit";
    severity: "high" | "medium";
    message: string;
    at: string;
  }> = [];

  const workspaceMap = new Map<string, { total: number; fallback: number; error: number }>();
  for (const event of providerEvents) {
    const current = workspaceMap.get(event.workspaceId) ?? { total: 0, fallback: 0, error: 0 };
    current.total += 1;
    if (event.status === "fallback") current.fallback += 1;
    if (event.status === "error") current.error += 1;
    workspaceMap.set(event.workspaceId, current);
  }
  for (const [workspaceId, metrics] of workspaceMap.entries()) {
    if (metrics.total >= 10 && metrics.fallback / metrics.total >= 0.2) {
      alerts.push({
        id: `fallback-${workspaceId}`,
        type: "provider",
        severity: "high",
        message: `Fallback ratio is high in ${workspaceId} (${metrics.fallback}/${metrics.total})`,
        at: new Date().toISOString()
      });
    } else if (metrics.error >= 4) {
      alerts.push({
        id: `error-${workspaceId}`,
        type: "provider",
        severity: "medium",
        message: `Provider errors increased in ${workspaceId} (${metrics.error} events)`,
        at: new Date().toISOString()
      });
    }
  }

  const bucketMap = new Map<string, number>();
  for (const event of rateLimitEvents) {
    const key = `${event.bucket}|${event.clientKey}`;
    bucketMap.set(key, (bucketMap.get(key) ?? 0) + 1);
  }
  for (const [key, count] of bucketMap.entries()) {
    if (count < 12) continue;
    const [bucket, clientKey] = key.split("|");
    alerts.push({
      id: `rate-${bucket}-${clientKey}`,
      type: "rate-limit",
      severity: count >= 20 ? "high" : "medium",
      message: `Rate-limit spike on ${bucket} from ${clientKey} (${count} throttles)`,
      at: new Date().toISOString()
    });
  }

  return NextResponse.json({
    windowMinutes,
    alerts: alerts.slice(0, 30)
  });
}
