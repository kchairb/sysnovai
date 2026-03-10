"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { onboardingSteps } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const isLast = step === onboardingSteps.length - 1;

  return (
    <div className="space-y-4">
      <div className="premium-page-hero">
        <p className="premium-page-kicker">Onboarding</p>
        <h1 className="premium-page-title">Set up your Sysnova AI workspace</h1>
        <p className="premium-page-description">
          Configure business context, language style, operations, and initial data.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {onboardingSteps.map((item, idx) => (
            <Badge key={item} variant={idx <= step ? "accent" : "default"}>
              {idx + 1}. {item}
            </Badge>
          ))}
        </div>
      </div>

      <section className="premium-panel p-6">
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="premium-form-label">Workspace name</label>
              <Input placeholder="Sysnova Commerce" />
            </div>
            <div>
              <label className="premium-form-label">Industry</label>
              <Input placeholder="Retail / Beauty / Food / Agency..." />
            </div>
            <div className="md:col-span-2">
              <label className="premium-form-label">Business description</label>
              <Textarea placeholder="Describe your activity, audience, and positioning..." />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="premium-form-label">Default language</label>
              <Input placeholder="French" />
            </div>
            <div>
              <label className="premium-form-label">Secondary languages</label>
              <Input placeholder="Darija, Arabic, English" />
            </div>
            <div className="md:col-span-2">
              <label className="premium-form-label">Tone profile</label>
              <Textarea placeholder="Warm, premium, trustworthy, concise..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="premium-form-label">Delivery rules</label>
              <Textarea placeholder="Tunis 24h, nationwide 48h, free above 120 TND..." />
            </div>
            <div>
              <label className="premium-form-label">Payment methods</label>
              <Textarea placeholder="Cash on delivery, card, D17..." />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="premium-form-label">First product name</label>
              <Input placeholder="Premium Olive Oil 750ml" />
            </div>
            <div>
              <label className="premium-form-label">Price</label>
              <Input placeholder="49 TND" />
            </div>
            <div className="md:col-span-2">
              <label className="premium-form-label">Short description</label>
              <Textarea placeholder="Premium Tunisian product with fast delivery..." />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="premium-form-label">FAQ question</label>
              <Input placeholder="Do you deliver to Sfax?" />
            </div>
            <div>
              <label className="premium-form-label">FAQ answer</label>
              <Textarea placeholder="Yes, we deliver to Sfax within 48 hours..." />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            <h2 className="mt-3 text-lg font-semibold">Workspace setup complete</h2>
            <p className="mt-1 text-sm text-secondary">
              Your Sysnova AI dashboard is ready with multilingual support and business
              context. You can now generate support replies, marketing copy, and API outputs.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={() =>
              setStep((prev) => (isLast ? prev : Math.min(prev + 1, onboardingSteps.length - 1)))
            }
          >
            {isLast ? "Done" : "Continue"}
            {!isLast && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </section>
    </div>
  );
}
