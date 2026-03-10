"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!acceptPolicy) {
      setError("Please accept Terms and Privacy Policy.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create account.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="premium-form-label">Full name</label>
        <Input
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div>
        <label className="premium-form-label">Work email</label>
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
          placeholder="Create strong password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <label className="flex items-start gap-2 text-xs text-secondary">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-border bg-elevated"
          checked={acceptPolicy}
          onChange={(event) => setAcceptPolicy(event.target.checked)}
        />
        I agree to the Terms and Privacy Policy for using Sysnova AI.
      </label>
      {error && <p className="text-xs text-error">{error}</p>}
      <Button className="w-full" type="submit" disabled={submitting}>
        {submitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
