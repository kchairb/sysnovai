"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const checkHealth = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          signal: controller.signal
        });
        if (!active) return;
        setHealth(response.ok ? "ok" : "down");
      } catch {
        if (!active) return;
        setHealth("down");
      } finally {
        clearTimeout(timeoutId);
      }
    };

    void checkHealth();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to sign in.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (nextError) {
      if (nextError instanceof TypeError) {
        setError("Network error. Refresh the page and retry, or disable blocking extensions for localhost.");
        return;
      }
      setError(nextError instanceof Error ? nextError.message : "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="premium-form-label">Email</label>
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div>
        <label className="premium-form-label">Password</label>
        <Input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <div className="flex justify-end">
        <Link href="/auth/forgot-password" className="text-xs text-accent hover:text-accent-hover">
          Forgot password?
        </Link>
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <div
        className={`rounded-lg border px-2.5 py-2 text-[11px] ${
          health === "ok"
            ? "border-success/35 bg-success/10 text-success"
            : health === "down"
              ? "border-error/35 bg-error/10 text-error"
              : "border-border/70 bg-elevated/25 text-secondary"
        }`}
      >
        Auth API status:{" "}
        {health === "ok" ? "Online" : health === "down" ? "Offline / blocked" : "Checking..."}
      </div>
      <Button className="w-full" type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
