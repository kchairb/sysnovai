"use client";

import { useEffect, useMemo, useState } from "react";
import { getSelectedWorkspaceId, WORKSPACE_EVENT } from "@/lib/client/workspace-selection";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BrandKnowledgeEntry = {
  id: string;
  workspaceId: string;
  category: "faq" | "policy" | "product" | "document" | "brand";
  title: string;
  content: string;
  tags: string[];
  isActive: boolean;
  updatedAt: string;
};

const categories: BrandKnowledgeEntry["category"][] = ["brand", "faq", "policy", "product", "document"];

export default function KnowledgePage() {
  const { tr } = useLocale();
  const [workspaceId, setWorkspaceId] = useState("workspace-default");
  const [entries, setEntries] = useState<BrandKnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | BrandKnowledgeEntry["category"]>("all");
  const [form, setForm] = useState({
    category: "brand" as BrandKnowledgeEntry["category"],
    title: "",
    content: "",
    tags: ""
  });

  const loadEntries = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/brand-knowledge?workspaceId=${encodeURIComponent(workspaceId)}&includeInactive=1&limit=300`
      );
      if (!response.ok) return;
      const payload = (await response.json()) as { entries?: BrandKnowledgeEntry[] };
      setEntries(payload.entries ?? []);
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
    void loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const filteredEntries = useMemo(
    () =>
      entries
        .filter((entry) => (categoryFilter === "all" ? true : entry.category === categoryFilter))
        .filter((entry) =>
          search.trim()
            ? `${entry.title}\n${entry.content}\n${entry.tags.join(" ")}`
                .toLowerCase()
                .includes(search.trim().toLowerCase())
            : true
        ),
    [entries, search, categoryFilter]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm({ category: "brand", title: "", content: "", tags: "" });
  };

  const onSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const tags = form.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (editingId) {
        await fetch(`/api/brand-knowledge/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            category: form.category,
            title: form.title,
            content: form.content,
            tags
          })
        });
      } else {
        await fetch("/api/brand-knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            category: form.category,
            title: form.title,
            content: form.content,
            tags
          })
        });
      }
      resetForm();
      await loadEntries();
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (entry: BrandKnowledgeEntry) => {
    setEditingId(entry.id);
    setForm({
      category: entry.category,
      title: entry.title,
      content: entry.content,
      tags: entry.tags.join(", ")
    });
  };

  const onToggleActive = async (entry: BrandKnowledgeEntry) => {
    await fetch(`/api/brand-knowledge/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        isActive: !entry.isActive
      })
    });
    await loadEntries();
  };

  const onDelete = async (entry: BrandKnowledgeEntry) => {
    await fetch(
      `/api/brand-knowledge/${entry.id}?workspaceId=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" }
    );
    if (editingId === entry.id) {
      resetForm();
    }
    await loadEntries();
  };

  return (
    <div className="space-y-4">
      <section className="dashboard-hero-surface premium-page-hero">
        <p className="premium-page-kicker">{tr("page.knowledgeKicker", "Knowledge Base")}</p>
        <h1 className="premium-page-title">
          {tr("page.knowledgeTitle", "Brand Knowledge Manager")}
        </h1>
        <p className="premium-page-description">
          {tr(
            "page.knowledgeDescription",
            "Teach your AI about your brand, products, policies, and tone. These entries are used by workspace and website chatbot responses."
          )}
        </p>
        <div className="mt-3">
          <Badge>
            {tr("common.workspace", "Workspace")}: {workspaceId}
          </Badge>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <article className="premium-panel p-4">
          <h2 className="text-lg font-medium">
            {editingId ? tr("knowledge.editEntry", "Edit entry") : tr("knowledge.newEntry", "New entry")}
          </h2>
          <div className="mt-3 space-y-2">
            <select
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value as BrandKnowledgeEntry["category"] }))
              }
              className="h-10 w-full rounded-md border border-border/70 bg-elevated/30 px-3 text-sm"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={tr("knowledge.entryTitle", "Title")}
            />
            <Textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              placeholder={tr("knowledge.entryContent", "Content")}
              className="min-h-[140px]"
            />
            <Input
              value={form.tags}
              onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              placeholder={tr("knowledge.entryTags", "Tags (comma separated)")}
            />
            <div className="flex gap-2">
              <Button onClick={() => void onSubmit()} disabled={saving}>
                {saving
                  ? tr("common.saving", "Saving...")
                  : editingId
                    ? tr("common.update", "Update")
                    : tr("common.create", "Create")}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  {tr("common.cancel", "Cancel")}
                </Button>
              )}
            </div>
          </div>
        </article>

        <article className="premium-panel p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium">{tr("knowledge.itemsTitle", "Brand entries")}</h2>
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tr("common.search", "Search")}
                className="h-9 w-44"
              />
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as "all" | BrandKnowledgeEntry["category"])
                }
                className="h-9 rounded-md border border-border/70 bg-elevated/30 px-2 text-xs"
              >
                <option value="all">{tr("common.all", "All")}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            {loading && <p className="text-xs text-muted">{tr("common.loading", "Loading...")}</p>}
            {!loading && !filteredEntries.length && (
              <p className="text-xs text-muted">{tr("common.noData", "No data yet.")}</p>
            )}
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-border/70 bg-elevated/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{entry.title}</p>
                  <div className="flex items-center gap-1">
                    <Badge>{entry.category}</Badge>
                    <Badge variant={entry.isActive ? "accent" : "outline"}>
                      {entry.isActive ? tr("common.active", "Active") : tr("common.inactive", "Inactive")}
                    </Badge>
                  </div>
                </div>
                <p className="mt-1 text-sm text-secondary">{entry.content}</p>
                {!!entry.tags.length && (
                  <p className="mt-1 text-xs text-muted">#{entry.tags.join(" #")}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(entry)}>
                    {tr("common.edit", "Edit")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void onToggleActive(entry)}>
                    {entry.isActive ? tr("common.deactivate", "Deactivate") : tr("common.activate", "Activate")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void onDelete(entry)}>
                    {tr("common.delete", "Delete")}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
