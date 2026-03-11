"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LlmStatus = {
  provider: string;
  model: string;
  hasOpenAiKey: boolean;
  hasGeminiKey: boolean;
  hasGroqKey?: boolean;
  hasOpenRouterKey?: boolean;
  hasProviderKey: boolean;
};

type ProviderHealth = {
  provider: string;
  status: "healthy" | "cooldown";
  cooldownUntil: string | null;
  consecutiveFailures: number;
  totalSuccess: number;
  totalFailure: number;
  lastError: string | null;
};

export function LlmProviderCard() {
  const { tr } = useLocale();
  const [status, setStatus] = useState<LlmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [testDiagnostics, setTestDiagnostics] = useState<{
    fallbackUsed?: boolean;
    providerErrorSource?: string | null;
    providerError?: string | null;
    hint?: string | null;
  } | null>(null);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [resetting, setResetting] = useState("");

  const loadStatus = async () => {
    try {
      const response = await fetch("/api/admin/llm/status");
      if (response.ok) {
        const payload = (await response.json()) as LlmStatus;
        setStatus(payload);
      }
      const circuitResponse = await fetch("/api/admin/llm/circuit");
      if (circuitResponse.ok) {
        const circuitPayload = (await circuitResponse.json()) as { providers?: ProviderHealth[] };
        setProviderHealth(circuitPayload.providers ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const runProviderTest = async () => {
    setTesting(true);
    setTestResult("");
    setTestDiagnostics(null);
    try {
      const response = await fetch("/api/admin/llm/test", { method: "POST" });
      const payload = (await response.json()) as {
        ok: boolean;
        provider?: string;
        model?: string;
        latencyMs?: number;
        error?: string;
        fallbackUsed?: boolean;
        diagnostics?: {
          providerErrorSource?: string | null;
          providerError?: string | null;
          hint?: string | null;
        };
      };
      if (!response.ok || !payload.ok) {
        setTestResult(
          `${tr("llm.providerTestFailed", "Provider test failed")}: ${payload.error ?? tr("llm.unknownError", "unknown error")}`
        );
        return;
      }
      setTestDiagnostics({
        fallbackUsed: payload.fallbackUsed,
        providerErrorSource: payload.diagnostics?.providerErrorSource ?? null,
        providerError: payload.diagnostics?.providerError ?? null,
        hint: payload.diagnostics?.hint ?? null
      });
      setTestResult(
        `${tr("llm.providerTestPassed", "Provider test passed")} (${payload.provider}/${payload.model}) ${tr("llm.in", "in")} ${payload.latencyMs}ms`
      );
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : tr("llm.providerTestFailed", "Provider test failed"));
    } finally {
      setTesting(false);
    }
  };

  const resetCircuit = async (provider?: string) => {
    setResetting(provider ?? "all");
    try {
      const response = await fetch("/api/admin/llm/circuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", provider })
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { providers?: ProviderHealth[] };
      setProviderHealth(payload.providers ?? []);
    } finally {
      setResetting("");
    }
  };

  return (
    <article className="premium-panel p-4">
      <h2 className="premium-section-title">{tr("llm.title", "LLM Provider")}</h2>
      <p className="mt-2 text-sm text-secondary">
        {tr("llm.description", "Configure Gemini, Groq, or OpenAI with automatic fallback support.")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="accent">
          {tr("llm.provider", "Provider")}: {loading ? tr("common.loading", "Loading...") : status?.provider ?? tr("llm.unknown", "unknown")}
        </Badge>
        <Badge>{tr("llm.model", "Model")}: {loading ? tr("common.loading", "Loading...") : status?.model ?? tr("llm.unknown", "unknown")}</Badge>
        <Badge variant={status?.hasProviderKey ? "success" : "default"}>
          {tr("llm.providerKey", "Provider key")}: {status?.hasProviderKey ? tr("llm.configured", "Configured") : tr("llm.missing", "Missing")}
        </Badge>
      </div>
      {!status?.hasProviderKey && !loading && (
        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-secondary">
          {status?.provider === "gemini"
            ? "Add GEMINI_API_KEY and optionally GEMINI_MODEL in .env.local, then restart the dev server."
            : status?.provider === "groq"
              ? "Add GROQ_API_KEY and optionally GROQ_MODEL in .env.local, then restart the dev server."
              : status?.provider === "openrouter"
                ? "Add OPENROUTER_API_KEY and optionally OPENROUTER_MODEL in .env.local, then restart the dev server."
              : "Add OPENAI_API_KEY and set SYSNOVA_LLM_PROVIDER=openai in .env.local, then restart the dev server."}
        </div>
      )}
      <div className="premium-action-row mt-4">
        <Button size="sm" variant="secondary" onClick={() => void loadStatus()}>
          {tr("common.refresh", "Refresh")}
        </Button>
        <Button size="sm" onClick={() => void runProviderTest()} disabled={testing}>
          {testing ? tr("llm.testing", "Testing...") : tr("llm.testProvider", "Test Provider")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => void resetCircuit()} disabled={resetting === "all"}>
          {resetting === "all" ? tr("llm.resetting", "Resetting...") : tr("llm.resetAllBreakers", "Reset all breakers")}
        </Button>
      </div>
      {testResult && (
        <div className="premium-subpanel mt-3 p-2 text-xs text-secondary">
          {testResult}
        </div>
      )}
      {testDiagnostics?.fallbackUsed && (
        <div className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-secondary">
          <p className="font-medium text-foreground">{tr("llm.fallbackDetected", "Fallback detected")}</p>
          <p className="mt-1">
            {testDiagnostics.providerErrorSource
              ? `${testDiagnostics.providerErrorSource} failed and Sysnova used mock fallback.`
              : "Primary provider failed and Sysnova used mock fallback."}
            {testDiagnostics.providerError ? ` Error: ${testDiagnostics.providerError}` : ""}
          </p>
          {testDiagnostics.hint && <p className="mt-1">{tr("llm.hint", "Hint")}: {testDiagnostics.hint}</p>}
        </div>
      )}
      {!!providerHealth.length && (
        <div className="mt-3 space-y-2">
          {providerHealth.map((item) => (
            <div
              key={item.provider}
              className="rounded-xl border border-border/70 bg-elevated/25 p-2 text-xs text-secondary"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">
                  {item.provider} · {item.status}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  onClick={() => void resetCircuit(item.provider)}
                  disabled={resetting === item.provider}
                >
                  {resetting === item.provider ? "..." : tr("llm.reset", "Reset")}
                </Button>
              </div>
              <p className="mt-1">
                failures: {item.totalFailure} · success: {item.totalSuccess} · consecutive:{" "}
                {item.consecutiveFailures}
              </p>
              {item.cooldownUntil && <p>cooldown until: {new Date(item.cooldownUntil).toLocaleTimeString()}</p>}
              {item.lastError && <p className="truncate">last error: {item.lastError}</p>}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
