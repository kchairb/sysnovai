"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteAcceptForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Invite token is missing. Use the invite link from your email/admin.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name,
          password
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to accept invite.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to accept invite.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="premium-form-label">Full name</label>
        <Input
          placeholder="Your full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div>
        <label className="premium-form-label">Create password</label>
        <Input
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <Button className="w-full" type="submit" disabled={submitting}>
        {submitting ? "Joining workspace..." : "Accept invite and continue"}
      </Button>
    </form>
  );
}
