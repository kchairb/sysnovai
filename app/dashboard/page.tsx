import { ArrowUpRight, Clock3, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProviderHealthTrend } from "@/components/dashboard/provider-health-trend";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { getDashboardHomeData } from "@/lib/server/dashboard-home";
import { getServerWorkspaceId } from "@/lib/server/workspace-cookie";

export default async function DashboardHomePage() {
  const locale = await getServerLocale();
  const workspaceId = await getServerWorkspaceId();
  const { stats, recentActivity } = await getDashboardHomeData(workspaceId);

  return (
    <div className="space-y-4">
      <section className="dashboard-hero-surface premium-page-hero">
        <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
          <div>
            <p className="premium-page-kicker">{t(locale, "page.dashboardKicker", "Dashboard Home")}</p>
            <h1 className="premium-page-title">{t(locale, "page.dashboardTitle", "Welcome back to Sysnova AI")}</h1>
            <p className="premium-page-description">
              {t(
                locale,
                "page.dashboardDescription",
                "Your premium AI workspace for support, sales, marketing, knowledge, and local Tunisian intelligence is active and ready."
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button>
                <Sparkles className="h-4 w-4" />
                {t(locale, "dashboard.newConversation", "New AI Conversation")}
              </Button>
              <Button variant="secondary">{t(locale, "dashboard.addKnowledge", "Add Knowledge Item")}</Button>
              <Button variant="outline">{t(locale, "dashboard.addProduct", "Add Product")}</Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="elevation-l3 p-3 text-sm text-secondary">
              <p className="text-xs uppercase tracking-wide text-muted">
                {t(locale, "dashboard.systemStatus", "System status")}
              </p>
              <p className="mt-2 flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-success" />
                {t(locale, "dashboard.allServicesOperational", "All services operational")}
              </p>
            </div>
            <div className="elevation-l2 p-3 text-sm text-secondary">
              <p className="text-xs uppercase tracking-wide text-muted">
                {t(locale, "dashboard.modelRouting", "Model routing")}
              </p>
              <p className="mt-2">{t(locale, "dashboard.modelRoutingValue", "Primary + fallback chain configured")}</p>
            </div>
            <div className="elevation-l1 p-3 text-sm text-secondary">
              <p className="text-xs uppercase tracking-wide text-muted">
                {t(locale, "dashboard.todayForecast", "Today forecast")}
              </p>
              <p className="mt-2">
                {t(locale, "dashboard.todayForecastValue", "Expected +12% request volume between 14:00 and 19:00.")}
              </p>
            </div>
            <ProviderHealthTrend />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} trend={stat.trend} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
        <article className="premium-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{t(locale, "dashboard.recentActivity", "Recent activity")}</h2>
            <Button variant="ghost" size="sm">
              {t(locale, "dashboard.viewAll", "View all")}
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-secondary">
            {recentActivity.map((item) => (
              <li key={item} className="elevation-l1 flex items-start gap-3 p-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent/80" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="premium-panel p-5">
          <h2 className="text-lg font-medium">{t(locale, "dashboard.quickActions", "Quick actions")}</h2>
          <div className="mt-4 space-y-2">
            <Button variant="secondary" className="w-full justify-start">
              {t(locale, "dashboard.quickReplyDarija", "Generate customer reply in Darija")}
            </Button>
            <Button variant="secondary" className="w-full justify-start">
              {t(locale, "dashboard.quickEmailFrench", "Write campaign email in French")}
            </Button>
            <Button variant="secondary" className="w-full justify-start">
              {t(locale, "dashboard.quickAdCopy", "Create product launch ad copy")}
            </Button>
          </div>
          <div className="mt-4 elevation-l2 p-3 text-xs text-secondary">
            <Clock3 className="mb-1 h-4 w-4 text-accent" />
            {t(locale, "dashboard.peakUsage", "Peak usage window today: 14:00 to 18:00 (Tunis).")}
          </div>
          <div className="mt-2 elevation-l1 p-3 text-xs text-secondary">
            {t(
              locale,
              "dashboard.conversionSignal",
              "Conversion signal: Support-to-sale handoff up by 8.4% this week."
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
