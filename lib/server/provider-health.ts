import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";

type ProviderHealthState = {
  totalSuccess: number;
  totalFailure: number;
  consecutiveFailures: number;
  lastError: string | null;
  lastLatencyMs: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  cooldownUntil: number | null;
};

type WorkspaceProviderEvent = {
  at: number;
  provider: string;
  status: "success" | "fallback" | "error";
  latencyMs?: number;
  errorMessage?: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __sysnovaProviderHealth: Map<string, ProviderHealthState> | undefined;
  // eslint-disable-next-line no-var
  var __sysnovaWorkspaceProviderEvents: Map<string, WorkspaceProviderEvent[]> | undefined;
}

const FAILURE_THRESHOLD = Number(process.env.SYSNOVA_PROVIDER_FAILURE_THRESHOLD ?? 3);
const COOLDOWN_MS = Number(process.env.SYSNOVA_PROVIDER_COOLDOWN_MS ?? 120000);

function getProviderStore() {
  if (!global.__sysnovaProviderHealth) {
    global.__sysnovaProviderHealth = new Map<string, ProviderHealthState>();
  }
  return global.__sysnovaProviderHealth;
}

function getWorkspaceStore() {
  if (!global.__sysnovaWorkspaceProviderEvents) {
    global.__sysnovaWorkspaceProviderEvents = new Map<string, WorkspaceProviderEvent[]>();
  }
  return global.__sysnovaWorkspaceProviderEvents;
}

function getProviderState(provider: string): ProviderHealthState {
  const store = getProviderStore();
  const current = store.get(provider);
  if (current) return current;
  const next: ProviderHealthState = {
    totalSuccess: 0,
    totalFailure: 0,
    consecutiveFailures: 0,
    lastError: null,
    lastLatencyMs: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    cooldownUntil: null
  };
  store.set(provider, next);
  return next;
}

export function isProviderCoolingDown(provider: string) {
  const state = getProviderState(provider);
  return Boolean(state.cooldownUntil && state.cooldownUntil > Date.now());
}

export function recordProviderSuccess(provider: string, latencyMs: number) {
  const state = getProviderState(provider);
  state.totalSuccess += 1;
  state.consecutiveFailures = 0;
  state.lastLatencyMs = latencyMs;
  state.lastSuccessAt = Date.now();
  state.lastError = null;
  state.cooldownUntil = null;
}

export function recordProviderFailure(provider: string, message: string) {
  const state = getProviderState(provider);
  state.totalFailure += 1;
  state.consecutiveFailures += 1;
  state.lastError = message;
  state.lastFailureAt = Date.now();
  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.cooldownUntil = Date.now() + COOLDOWN_MS;
  }
}

export function recordWorkspaceProviderEvent(
  workspaceId: string,
  event: {
    provider: string;
    status: "success" | "fallback" | "error";
    latencyMs?: number;
    errorMessage?: string | null;
  }
) {
  const store = getWorkspaceStore();
  const current = store.get(workspaceId) ?? [];
  const next = [{ at: Date.now(), ...event }, ...current].slice(0, 40);
  store.set(workspaceId, next);

  if (hasDatabaseUrl()) {
    void getPrisma().providerHealthEvent
      .create({
        data: {
          workspaceId,
          provider: event.provider,
          status: event.status,
          latencyMs: event.latencyMs ?? null,
          errorMessage: event.errorMessage ?? null
        }
      })
      .catch(() => undefined);
  }
}

export function getProviderHealthSnapshot() {
  const store = getProviderStore();
  return Array.from(store.entries()).map(([provider, state]) => ({
    provider,
    status: isProviderCoolingDown(provider) ? "cooldown" : "healthy",
    cooldownUntil: state.cooldownUntil ? new Date(state.cooldownUntil).toISOString() : null,
    totalSuccess: state.totalSuccess,
    totalFailure: state.totalFailure,
    consecutiveFailures: state.consecutiveFailures,
    lastError: state.lastError,
    lastLatencyMs: state.lastLatencyMs,
    lastSuccessAt: state.lastSuccessAt ? new Date(state.lastSuccessAt).toISOString() : null,
    lastFailureAt: state.lastFailureAt ? new Date(state.lastFailureAt).toISOString() : null
  }));
}

export function getWorkspaceProviderBadge(workspaceId: string) {
  const events = (getWorkspaceStore().get(workspaceId) ?? []).filter(
    (event) => event.at > Date.now() - 30 * 60 * 1000
  );
  const fallbackCount = events.filter((event) => event.status === "fallback").length;
  const errorCount = events.filter((event) => event.status === "error").length;
  const successCount = events.filter((event) => event.status === "success").length;
  const last = events[0];

  const badge =
    last?.status === "fallback" || fallbackCount > 0
      ? "fallback"
      : errorCount > 0
        ? "degraded"
        : "healthy";

  return {
    badge,
    summary: {
      fallbackCount,
      errorCount,
      successCount
    },
    lastEvent: last
      ? {
          provider: last.provider,
          status: last.status,
          latencyMs: last.latencyMs ?? null,
          at: new Date(last.at).toISOString()
        }
      : null
  };
}

export function resetProviderCircuit(provider?: string) {
  const store = getProviderStore();
  if (!provider) {
    for (const [, state] of store.entries()) {
      state.consecutiveFailures = 0;
      state.cooldownUntil = null;
      state.lastError = null;
    }
    return;
  }
  const state = getProviderState(provider);
  state.consecutiveFailures = 0;
  state.cooldownUntil = null;
  state.lastError = null;
}

export async function getWorkspaceProviderTrend(
  workspaceId: string,
  limit = 30,
  options?: { sinceMs?: number }
) {
  const sinceDate =
    options?.sinceMs && options.sinceMs > 0 ? new Date(Date.now() - options.sinceMs) : null;

  if (hasDatabaseUrl()) {
    const rows = await getPrisma().providerHealthEvent.findMany({
      where: {
        workspaceId,
        ...(sinceDate ? { createdAt: { gte: sinceDate } } : {})
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 5), 120)
    });
    return rows.map((row) => ({
      provider: row.provider,
      status: row.status,
      latencyMs: row.latencyMs,
      at: row.createdAt.toISOString()
    }));
  }

  return (getWorkspaceStore().get(workspaceId) ?? [])
    .filter((row) => (!sinceDate ? true : row.at >= sinceDate.getTime()))
    .slice(0, limit)
    .map((row) => ({
      provider: row.provider,
      status: row.status,
      latencyMs: row.latencyMs ?? null,
      at: new Date(row.at).toISOString()
    }));
}
