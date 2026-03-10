"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Code2,
  Database,
  Globe2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Logo } from "@/components/layout/logo";

const features = [
  {
    title: "Business AI Workspace",
    text: "Generate customer replies, sales messaging, and internal communication from one premium workspace.",
    icon: BriefcaseBusiness
  },
  {
    title: "Knowledge + Product Intelligence",
    text: "Combine FAQs, policies, catalog details, and company context so AI outputs stay accurate.",
    icon: Database
  },
  {
    title: "Tunisian Personal AI",
    text: "Native support for Darija, Arabic, French, and English with localized everyday understanding.",
    icon: Globe2
  },
  {
    title: "Developer API",
    text: "Ship AI inside your product via modern endpoints for chat, marketing, products, and local assistant flows.",
    icon: Code2
  }
];

const useCases = [
  "Reply to customer messages in Darija and French",
  "Generate premium campaign copy for Meta and WhatsApp",
  "Create structured internal knowledge and product docs",
  "Offer local Tunisian guidance through personal AI mode"
];

export function LandingPage() {
  const { tr } = useLocale();

  return (
    <main className="pb-20">
      <section className="page-shell pt-8">
        <header className="premium-panel flex items-center justify-between p-4">
          <Logo />
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost">Features</Button>
            <Button variant="ghost">API</Button>
            <Button variant="ghost">Pricing</Button>
          </div>
          <ThemeToggle />
          <LanguageSwitcher />
          <Button asChild size="sm">
            <Link href="/dashboard">{tr("landing.openDashboard", "Open Dashboard")}</Link>
          </Button>
        </header>
      </section>

      <section className="landing-hero-surface page-shell mt-8 rounded-3xl border border-border/70 p-8 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-6">
            <Badge variant="accent">{tr("landing.heroBadge", "Startup-grade AI SaaS for Tunisia and beyond")}</Badge>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
              {tr(
                "landing.heroTitle",
                "One AI platform for business workflows, knowledge, and Tunisian intelligence"
              )}
            </h1>
            <p className="max-w-2xl text-secondary">
              {tr(
                "landing.heroDescription",
                "Sysnova AI helps businesses organize knowledge, generate content, answer customers, and integrate AI through API while also offering a personal Tunisian assistant that understands Darija, Arabic, French, and English."
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  {tr("landing.ctaPrimary", "Start Free Workspace")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary">
                {tr("landing.ctaSecondary", "View Product Tour")}
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="landing-chip">99.9% uptime API routing</div>
              <div className="landing-chip">FR + AR + Darija ready</div>
              <div className="landing-chip">Business-grade workspace UI</div>
            </div>
          </div>

          <div className="premium-panel bg-background/25 p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium">Sysnova AI Preview</p>
              <Badge variant="accent">Live Mock Data</Badge>
            </div>
            <div className="grid gap-4">
              <div className="premium-subpanel p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Today</p>
                <p className="mt-2 text-sm text-secondary">
                  223 replies generated, 41 marketing drafts, 12 API calls from CRM.
                </p>
              </div>
              <div className="premium-subpanel p-4">
                <div className="flex items-center gap-2 text-accent">
                  <Bot className="h-4 w-4" />
                  <p className="text-sm font-medium">Tunisian Assistant</p>
                </div>
                <p className="mt-2 text-sm text-secondary">
                  "Kifeh naktb email rasmi bel franse?" answered in mixed Darija + French.
                </p>
              </div>
              <div className="premium-subpanel p-4">
                <div className="flex items-center gap-2 text-accent">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-sm font-medium">Campaign Suggestion</p>
                </div>
                <p className="mt-2 text-sm text-secondary">
                  Suggested Ramadan ad angles for Tunis, Sousse, and Sfax audiences.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="page-shell mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <article key={feature.title} className="premium-panel p-5 premium-interactive">
            <feature.icon className="h-5 w-5 text-accent" />
            <h3 className="mt-3 text-base font-medium">{feature.title}</h3>
            <p className="mt-2 text-sm text-secondary">{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="page-shell mt-12 grid gap-6 lg:grid-cols-2">
        <article className="premium-panel p-6">
          <p className="text-xs uppercase tracking-wide text-muted">Business Use Cases</p>
          <h2 className="mt-2 text-2xl font-semibold">Built for serious teams</h2>
          <ul className="mt-4 space-y-3 text-sm text-secondary">
            {useCases.map((item) => (
              <li key={item} className="premium-subpanel p-3">
                {item}
              </li>
            ))}
          </ul>
        </article>
        <article className="premium-panel p-6">
          <p className="text-xs uppercase tracking-wide text-muted">How It Works</p>
          <h2 className="mt-2 text-2xl font-semibold">From onboarding to AI automation</h2>
          <ol className="mt-4 space-y-3 text-sm text-secondary">
            <li className="premium-subpanel p-3">
              Create workspace and set language defaults
            </li>
            <li className="premium-subpanel p-3">
              Upload products, FAQs, and business policies
            </li>
            <li className="premium-subpanel p-3">
              Generate replies, campaigns, and personal assistant outputs
            </li>
            <li className="premium-subpanel p-3">
              Integrate via API for scalable internal workflows
            </li>
          </ol>
        </article>
      </section>

      <section className="page-shell mt-12">
        <article className="premium-panel p-8 text-center">
          <p className="text-sm text-secondary">
            API-ready architecture for chat replies, marketing generation, products, and
            Tunisian assistant mode.
          </p>
          <h2 className="mt-3 text-2xl font-semibold md:text-3xl">
            Start building with Sysnova AI today
          </h2>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/dashboard">Launch Dashboard</Link>
            </Button>
            <Button variant="outline">Talk to Sales</Button>
          </div>
        </article>
      </section>

      <footer className="page-shell mt-12 border-t border-border/60 pt-6 text-sm text-muted">
        <p>Sysnova AI - Premium AI platform for modern business and Tunisian users.</p>
      </footer>
    </main>
  );
}
