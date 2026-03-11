import { apiEndpoints, apiKeys } from "@/lib/mock-data";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { listRecentPublicChatLogs } from "@/lib/server/public-chat-log-store";
import { Button } from "@/components/ui/button";

export default async function ApiPage() {
  const locale = await getServerLocale();
  const publicLogs = await listRecentPublicChatLogs(12);
  return (
    <div className="space-y-4">
      <section className="premium-page-hero">
        <p className="premium-page-kicker">{t(locale, "page.apiKicker", "Developer API")}</p>
        <h1 className="premium-page-title">
          {t(locale, "page.apiTitle", "Integrate Sysnova AI in your product")}
        </h1>
        <p className="premium-page-description">
          {t(
            locale,
            "page.apiDescription",
            "Manage API keys, monitor usage, and call endpoints for business and Tunisian assistant features."
          )}
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <article className="premium-panel p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="premium-section-title">{t(locale, "api.apiKeys", "API Keys")}</h2>
            <Button size="sm">{t(locale, "api.createKey", "Create Key")}</Button>
          </div>
          <div className="space-y-2">
            {apiKeys.map((item) => (
              <div key={item.id} className="premium-subpanel p-3 premium-interactive">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-success">{item.status}</p>
                </div>
                <p className="mt-1 text-xs text-secondary">{item.keyPreview}</p>
                <p className="mt-1 text-xs text-muted">
                  {t(locale, "api.created", "Created")} {item.createdAt} ·{" "}
                  {t(locale, "api.lastUsed", "Last used")} {item.lastUsed}
                </p>
                <div className="premium-action-row mt-4">
                  <Button size="sm" variant="outline">
                    {t(locale, "common.copy", "Copy")}
                  </Button>
                  <Button size="sm" variant="secondary">
                    {t(locale, "common.revoke", "Revoke")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="premium-panel p-4">
          <h2 className="premium-section-title">{t(locale, "api.endpoints", "Endpoints")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-secondary">
            {apiEndpoints.map((endpoint) => (
              <li key={endpoint} className="premium-subpanel p-3">
                {endpoint}
              </li>
            ))}
          </ul>
          <div className="mt-4 premium-subpanel p-3 text-xs text-secondary">
            <p className="font-medium text-foreground">{t(locale, "api.exampleRequest", "Example request")}</p>
            <p className="mt-2">POST /api/chat/reply</p>
            <p className="mt-1 font-mono">
              {'{"language":"fr","mode":"support","prompt":"Client asking about delivery"}'}
            </p>
          </div>
        </article>
      </section>

      <section className="premium-panel p-4">
        <h2 className="premium-section-title">{t(locale, "api.websiteWidget", "Website Chat Widget (Multi-store)")}</h2>
        <p className="mt-2 text-sm text-secondary">
          {t(
            locale,
            "api.websiteWidgetDescription",
            "Use this endpoint on storefront websites to get targeted replies per domain."
          )}
        </p>
        <div className="mt-4 grid gap-2 text-sm text-secondary">
          <div className="premium-subpanel p-3">
            Endpoint: <span className="font-mono text-foreground">POST /api/public/chat</span>
          </div>
          <div className="premium-subpanel p-3">
            Stream endpoint:{" "}
            <span className="font-mono text-foreground">POST /api/public/chat/stream</span>
          </div>
          <div className="premium-subpanel p-3">
            Allowed domains:{" "}
            <span className="font-mono text-foreground">
              collectionprestige.tn, shomokhstore.com
            </span>
          </div>
          <div className="premium-subpanel p-3">
            Body:{" "}
            <span className="font-mono text-foreground">
              {
                "{\"domain\":\"www.collectionprestige.tn\",\"prompt\":\"...\",\"language\":\"fr\",\"lead\":{\"name\":\"...\",\"phone\":\"...\"}}"
              }
            </span>
          </div>
        </div>
      </section>

      <section className="premium-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="premium-section-title">{t(locale, "api.websiteTranscripts", "Website Chat Transcripts")}</h2>
          <p className="text-xs text-muted">
            {t(locale, "api.latestMessages", "Latest")} {publicLogs.length}{" "}
            {t(locale, "api.messages", "messages")}
          </p>
        </div>
        <div className="space-y-2">
          {publicLogs.length === 0 && (
            <div className="premium-subpanel p-3 text-sm text-secondary">
              {t(locale, "api.noWebsiteLogs", "No website chat logs yet.")}
            </div>
          )}
          {publicLogs.map((log) => (
            <article key={log.id} className="premium-subpanel p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">
                  {log.assistantName} · {log.domain}
                </p>
                <p className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-2 text-xs text-secondary">Customer: {log.prompt}</p>
              <p className="mt-1 text-xs text-secondary">Assistant: {log.reply}</p>
              <p className="mt-1 text-xs text-muted">
                {log.language} · {log.provider}/{log.model}
                {log.lead?.phone ? ` · Lead: ${log.lead.name ?? "unknown"} (${log.lead.phone})` : ""}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
