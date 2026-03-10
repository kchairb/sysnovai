"use client";

import { useEffect, useMemo, useState } from "react";
import { getSelectedWorkspaceId, WORKSPACE_EVENT } from "@/lib/client/workspace-selection";
import { useLocale } from "@/components/i18n/locale-provider";

type TrendPoint = {
  provider: string;
  status: string;
  latencyMs: number | null;
  at: string;
};

export function ProviderHealthTrend() {
  const { tr } = useLocale();
  const [workspaceId, setWorkspaceId] = useState("workspace-default");
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [range, setRange] = useState<"1h" | "24h" | "7d">("24h");

  const loadTrend = async (targetWorkspaceId: string, targetRange: "1h" | "24h" | "7d") => {
    const response = await fetch(
      `/api/workspace/provider-health?workspaceId=${encodeURIComponent(targetWorkspaceId)}&range=${targetRange}`
    );
    if (!response.ok) return;
    const payload = (await response.json()) as { trend?: TrendPoint[] };
    setTrend(payload.trend ?? []);
  };

  useEffect(() => {
    const current = getSelectedWorkspaceId();
    setWorkspaceId(current);
    void loadTrend(current, range);
    const onWorkspaceChange = (event: Event) => {
      const custom = event as CustomEvent<{ workspaceId?: string }>;
      const next = custom.detail?.workspaceId ?? getSelectedWorkspaceId();
      setWorkspaceId(next);
      void loadTrend(next, range);
    };
    window.addEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
    const intervalId = window.setInterval(
      () => void loadTrend(getSelectedWorkspaceId(), range),
      25000
    );
    return () => {
      window.removeEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
      window.clearInterval(intervalId);
    };
  }, [range]);

  const series = useMemo(() => trend.slice(0, 16).reverse(), [trend]);
  const maxLatency = Math.max(...series.map((item) => item.latencyMs ?? 0), 100);

  return (
    <div className="elevation-l1 p-3 text-sm text-secondary">
      <p className="text-xs uppercase tracking-wide text-muted">
        {tr("dashboard.providerReliabilityTrend", "Provider reliability trend")}
      </p>
      <p className="mt-1 text-[11px] text-muted">
        {tr("common.workspace", "Workspace")}: {workspaceId}
      </p>
      <div className="mt-2 flex gap-1">
        {(["1h", "24h", "7d"] as const).map((item) => (
          <button
            key={item}
            suppressHydrationWarning
            type="button"
            onClick={() => setRange(item)}
            className={`rounded border px-1.5 py-0.5 text-[10px] ${
              item === range
                ? "border-accent/40 bg-accent/15 text-foreground"
                : "border-border/70 bg-elevated/30 text-secondary"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-3 flex h-20 items-end gap-1">
        {series.map((point, idx) => {
          const normalized = Math.max(8, Math.round(((point.latencyMs ?? 40) / maxLatency) * 100));
          const barColor =
            point.status === "success"
              ? "bg-success/60"
              : point.status === "fallback"
                ? "bg-warning/70"
                : "bg-error/70";
          return (
            <div
              key={`${point.at}-${idx}`}
              className={`w-3 rounded-sm ${barColor}`}
              style={{ height: `${normalized}%` }}
              title={`${point.provider} · ${point.status} · ${point.latencyMs ?? 0}ms`}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {tr(
          "dashboard.providerReliabilityLegend",
          "Green: success, Amber: fallback, Red: error. Height represents latency."
        )}
      </p>
    </div>
  );
}
