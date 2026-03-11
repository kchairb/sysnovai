import { Boxes, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { listWorkspaceProducts } from "@/lib/server/product-store";
import { getServerWorkspaceId } from "@/lib/server/workspace-cookie";

export default async function ProductsPage() {
  const locale = await getServerLocale();
  const workspaceId = await getServerWorkspaceId();
  const products = await listWorkspaceProducts({
    workspaceId,
    includeInactive: false,
    limit: 200
  }).catch(() => []);
  const withImage = products.filter((item) => Boolean(item.imageUrl)).length;

  return (
    <div className="space-y-4">
      <section className="dashboard-hero-surface premium-page-hero">
        <p className="premium-page-kicker">{t(locale, "page.productsKicker", "Products")}</p>
        <h1 className="premium-page-title">
          {t(locale, "page.productsTitle", "Product catalog intelligence")}
        </h1>
        <p className="premium-page-description">
          {t(
            locale,
            "page.productsDescription",
            "Teach Sysnova AI your catalog so support, sales, and marketing outputs stay product-aware and consistent."
          )}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="premium-panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">{t(locale, "products.total", "Total products")}</p>
          <p className="mt-1 text-2xl font-semibold">{products.length}</p>
        </article>
        <article className="premium-panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">{t(locale, "products.withImages", "With images")}</p>
          <p className="mt-1 text-2xl font-semibold">{withImage}</p>
        </article>
        <article className="premium-panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">{t(locale, "products.workspace", "Workspace")}</p>
          <p className="mt-1 truncate text-sm font-medium">{workspaceId}</p>
        </article>
      </section>

      <section className="grid gap-4">
        <article className="premium-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium">{t(locale, "products.catalog", "Catalog")}</h2>
            <Badge>{t(locale, "products.autoIngested", "Auto-filled by crawler")}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {!products.length && (
              <div className="elevation-l1 p-4 text-sm text-secondary">
                {t(
                  locale,
                  "products.emptyCatalog",
                  "No products yet. Crawl your site from Knowledge > Learn and product pages will auto-appear here."
                )}
              </div>
            )}
            {!!products.length && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <article key={product.id} className="premium-subpanel overflow-hidden">
                    <div className="relative aspect-[4/3] w-full bg-elevated/30">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted">
                          <Boxes className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
                        {product.category && (
                          <Badge variant="default" className="shrink-0">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                      {product.price && <p className="text-sm text-secondary">{product.price}</p>}
                      {product.description && (
                        <p className="line-clamp-3 text-xs text-muted">{product.description}</p>
                      )}
                      {!!product.tags.length && (
                        <p className="line-clamp-2 text-[11px] text-muted">#{product.tags.join(" #")}</p>
                      )}
                      {product.sourceUrl && (
                        <a
                          href={product.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          {t(locale, "products.viewSource", "View source")}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
