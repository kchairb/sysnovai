"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, ExternalLink } from "lucide-react";
import { getSelectedWorkspaceId, WORKSPACE_EVENT } from "@/lib/client/workspace-selection";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ProductRecord = {
  id: string;
  workspaceId: string;
  name: string;
  category?: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  sourceUrl?: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function ProductsPage() {
  const { tr } = useLocale();
  const [workspaceId, setWorkspaceId] = useState("workspace-default");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [search, setSearch] = useState("");
  const [sourceDomain, setSourceDomain] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [report, setReport] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    imageUrl: "",
    sourceUrl: "",
    tags: "",
    description: ""
  });

  const loadProducts = async () => {
    setLoading(true);
    setReport("");
    try {
      const params = new URLSearchParams();
      params.set("workspaceId", workspaceId);
      params.set("limit", "300");
      if (search.trim()) params.set("search", search.trim());
      if (sourceDomain !== "all") params.set("sourceDomain", sourceDomain);
      const response = await fetch(`/api/products?${params.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as {
        data?: ProductRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? tr("products.loadFailed", "Failed to load products."));
      }
      setProducts(payload.data ?? []);
    } catch (error) {
      setReport(error instanceof Error ? error.message : tr("products.loadFailed", "Failed to load products."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const selected = getSelectedWorkspaceId();
    setWorkspaceId(selected);
    const onWorkspaceChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ workspaceId?: string }>;
      setWorkspaceId(customEvent.detail?.workspaceId ?? getSelectedWorkspaceId());
    };
    window.addEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
    return () => window.removeEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
  }, []);

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, sourceDomain]);

  const domains = useMemo(() => {
    const set = new Set<string>();
    for (const product of products) {
      if (!product.sourceUrl) continue;
      try {
        set.add(new URL(product.sourceUrl).hostname);
      } catch {
        // ignore malformed
      }
    }
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const withImage = products.filter((item) => Boolean(item.imageUrl)).length;

  const onSearch = async () => {
    await loadProducts();
  };

  const onStartEdit = (product: ProductRecord) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category ?? "",
      price: product.price ?? "",
      imageUrl: product.imageUrl ?? "",
      sourceUrl: product.sourceUrl ?? "",
      tags: product.tags.join(", "),
      description: product.description ?? ""
    });
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setForm({
      name: "",
      category: "",
      price: "",
      imageUrl: "",
      sourceUrl: "",
      tags: "",
      description: ""
    });
  };

  const onSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setReport("");
    try {
      const tags = form.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const response = await fetch(`/api/products/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: form.name,
          category: form.category || null,
          price: form.price || null,
          imageUrl: form.imageUrl || null,
          sourceUrl: form.sourceUrl || null,
          description: form.description || null,
          tags
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? tr("products.saveFailed", "Failed to save product."));
      }
      onCancelEdit();
      await loadProducts();
      setReport(tr("products.saved", "Product updated."));
    } catch (error) {
      setReport(error instanceof Error ? error.message : tr("products.saveFailed", "Failed to save product."));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (productId: string) => {
    setReport("");
    const response = await fetch(
      `/api/products/${productId}?workspaceId=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" }
    );
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setReport(payload.error ?? tr("products.deleteFailed", "Failed to delete product."));
      return;
    }
    if (editingId === productId) {
      onCancelEdit();
    }
    await loadProducts();
    setReport(tr("products.deleted", "Product deleted."));
  };

  return (
    <div className="space-y-4">
      <section className="dashboard-hero-surface premium-page-hero">
        <p className="premium-page-kicker">{tr("page.productsKicker", "Products")}</p>
        <h1 className="premium-page-title">
          {tr("page.productsTitle", "Product catalog intelligence")}
        </h1>
        <p className="premium-page-description">
          {tr(
            "page.productsDescription",
            "Teach Sysnova AI your catalog so support, sales, and marketing outputs stay product-aware and consistent."
          )}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="premium-panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">
            {tr("products.total", "Total products")}
          </p>
          <p className="mt-1 text-2xl font-semibold">{products.length}</p>
        </article>
        <article className="premium-panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">
            {tr("products.withImages", "With images")}
          </p>
          <p className="mt-1 text-2xl font-semibold">{withImage}</p>
        </article>
        <article className="premium-panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted">
            {tr("products.workspace", "Workspace")}
          </p>
          <p className="mt-1 truncate text-sm font-medium">{workspaceId}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <article className="premium-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium">{tr("products.catalog", "Catalog")}</h2>
            <Badge>{tr("products.autoIngested", "Auto-filled by crawler")}</Badge>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tr("common.search", "Search")}
              className="h-9 w-44"
            />
            <select
              value={sourceDomain}
              onChange={(event) => setSourceDomain(event.target.value)}
              className="h-9 rounded-md border border-border/70 bg-elevated/30 px-2 text-xs"
            >
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain === "all" ? tr("products.allDomains", "All domains") : domain}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={() => void onSearch()} disabled={loading}>
              {loading ? tr("common.loading", "Loading...") : tr("common.search", "Search")}
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {!!report && <p className="text-xs text-muted">{report}</p>}
            {!products.length && (
              <div className="elevation-l1 p-4 text-sm text-secondary">
                {tr(
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
                          {tr("products.viewSource", "View source")}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onStartEdit(product)}>
                          {tr("common.edit", "Edit")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void onDelete(product.id)}>
                          {tr("common.delete", "Delete")}
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </article>
        <article className="premium-panel p-4">
          <h2 className="text-lg font-medium">{tr("products.editPanel", "Edit product")}</h2>
          {!editingId && (
            <p className="mt-3 text-sm text-secondary">
              {tr("products.selectToEdit", "Select a product from the catalog to edit or delete.")}
            </p>
          )}
          {!!editingId && (
            <div className="mt-3 space-y-2">
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={tr("products.form.productName", "Product name")}
              />
              <Input
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                placeholder={tr("products.form.category", "Category")}
              />
              <Input
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                placeholder={tr("products.form.price", "Price")}
              />
              <Input
                value={form.imageUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                placeholder={tr("products.form.imageUrl", "Image URL")}
              />
              <Input
                value={form.sourceUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                placeholder={tr("products.form.sourceUrl", "Source URL")}
              />
              <Input
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder={tr("products.form.tags", "Tags (comma separated)")}
              />
              <Textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder={tr("products.form.longDescription", "Long description")}
                className="min-h-[120px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void onSaveEdit()} disabled={saving}>
                  {saving ? tr("common.saving", "Saving...") : tr("common.save", "Save")}
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  {tr("common.cancel", "Cancel")}
                </Button>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
