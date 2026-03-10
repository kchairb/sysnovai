import { Plus, Upload } from "lucide-react";
import { knowledgeItems, knowledgeSummary } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function KnowledgePage() {
  const locale = await getServerLocale();

  return (
    <div className="space-y-4">
      <section className="dashboard-hero-surface premium-page-hero">
        <p className="premium-page-kicker">{t(locale, "page.knowledgeKicker", "Knowledge Base")}</p>
        <h1 className="premium-page-title">
          {t(locale, "page.knowledgeTitle", "Business memory for accurate AI outputs")}
        </h1>
        <p className="premium-page-description">
          {t(
            locale,
            "page.knowledgeDescription",
            "Store FAQs, policies, business information, notes, and documents that power Sysnova AI responses."
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t(locale, "knowledge.addFaq", "Add FAQ")}
          </Button>
          <Button variant="secondary">
            <Upload className="mr-2 h-4 w-4" />
            {t(locale, "knowledge.uploadDocument", "Upload Document")}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(knowledgeSummary).map(([key, value]) => (
          <article key={key} className="elevation-l2 premium-interactive p-4">
            <p className="premium-page-kicker">{key}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </article>
        ))}
      </section>

      <section className="premium-panel p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">{t(locale, "knowledge.itemsTitle", "Knowledge Items")}</h2>
          <Button variant="ghost" size="sm">
            {t(locale, "knowledge.filterByTopic", "Filter by Topic")}
          </Button>
        </div>
        <div className="space-y-2">
          {knowledgeItems.map((item) => (
            <article
              key={item.id}
              className="elevation-l1 p-3 text-sm premium-interactive"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted">
                  {t(locale, "knowledge.updatedAt", "Updated")} {item.updatedAt}
                </p>
              </div>
              <div className="mt-2 flex gap-2">
                <Badge>{item.type}</Badge>
                <Badge>{item.topic}</Badge>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
