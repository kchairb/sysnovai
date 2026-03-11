"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
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

type BrandProfile = {
  workspaceId: string;
  brandName: string;
  websiteUrl: string;
  instagram: string;
  defaultMode: "general" | "support" | "sales" | "marketing" | "tunisian-assistant";
  context: string;
  updatedAt: string;
};

const categories: BrandKnowledgeEntry["category"][] = ["brand", "faq", "policy", "product", "document"];

export default function KnowledgePage() {
  const { tr } = useLocale();
  const [workspaceId, setWorkspaceId] = useState("workspace-default");
  const [entries, setEntries] = useState<BrandKnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deduping, setDeduping] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | BrandKnowledgeEntry["category"]>("all");
  const [ingestUrls, setIngestUrls] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestReport, setIngestReport] = useState<string>("");
  const [dedupeReport, setDedupeReport] = useState<string>("");
  const [ingestDetails, setIngestDetails] = useState<
    Array<{
      url: string;
      ok: boolean;
      error?: string;
      pagesCrawled?: number;
      entriesCreated?: number;
      entriesUpdated?: number;
      entriesSkipped?: number;
      productsCreated?: number;
      productsUpdated?: number;
    }>
  >([]);
  const [crawlHistory, setCrawlHistory] = useState<
    Array<{
      id: string;
      strategyUsed: string;
      requestedStrategy?: string;
      pagesCrawled: number;
      entriesCreated: number;
      entriesUpdated: number;
      entriesSkipped: number;
      productsCreated: number;
      productsUpdated: number;
      successCount: number;
      failedCount: number;
      createdAt: string;
    }>
  >([]);
  const [crawlSite, setCrawlSite] = useState(true);
  const [maxPagesPerSite, setMaxPagesPerSite] = useState(12);
  const [crawlStrategy, setCrawlStrategy] = useState<
    "auto" | "balanced" | "products-first" | "support-first"
  >("auto");
  const [testPrompt, setTestPrompt] = useState("");
  const [testLanguage, setTestLanguage] = useState<"darija" | "ar" | "fr" | "en">("fr");
  const [testMode, setTestMode] = useState<
    "general" | "support" | "sales" | "marketing" | "tunisian-assistant"
  >("support");
  const [testing, setTesting] = useState(false);
  const [testReply, setTestReply] = useState("");
  const [testMeta, setTestMeta] = useState<{ provider?: string; model?: string } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileReport, setProfileReport] = useState("");
  const [brandProfile, setBrandProfile] = useState<BrandProfile>({
    workspaceId: "workspace-default",
    brandName: "My Brand",
    websiteUrl: "",
    instagram: "",
    defaultMode: "support",
    context: "",
    updatedAt: new Date().toISOString()
  });
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupInput, setPopupInput] = useState("");
  const [popupSending, setPopupSending] = useState(false);
  const [popupMessages, setPopupMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([]);
  const [activeFlowStep, setActiveFlowStep] = useState<"setup" | "learn" | "test">("setup");
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

  const loadBrandProfile = async () => {
    const response = await fetch(`/api/brand-profile?workspaceId=${encodeURIComponent(workspaceId)}`);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setProfileReport(payload.error ?? tr("settings.loadFailed", "Failed to load settings."));
      return;
    }
    const payload = (await response.json()) as { profile?: BrandProfile };
    if (payload.profile) {
      setBrandProfile(payload.profile);
      setTestMode(payload.profile.defaultMode);
      setProfileReport("");
    }
  };

  const loadCrawlHistory = async () => {
    const response = await fetch(
      `/api/brand-knowledge/ingest/history?workspaceId=${encodeURIComponent(workspaceId)}&limit=10`
    );
    if (!response.ok) {
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as {
      runs?: Array<{
        id: string;
        strategyUsed: string;
        requestedStrategy?: string;
        pagesCrawled: number;
        entriesCreated: number;
        entriesUpdated: number;
        entriesSkipped: number;
        productsCreated: number;
        productsUpdated: number;
        successCount: number;
        failedCount: number;
        createdAt: string;
      }>;
    };
    setCrawlHistory(payload.runs ?? []);
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
    void loadBrandProfile();
    void loadCrawlHistory();
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
  const activeEntries = useMemo(() => entries.filter((entry) => entry.isActive), [entries]);
  const categoryCounts = useMemo(() => {
    return categories.map((category) => ({
      category,
      count: activeEntries.filter((entry) => entry.category === category).length
    }));
  }, [activeEntries]);
  const duplicateEstimate = useMemo(() => {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const entry of entries) {
      const fingerprint = `${entry.category}|${entry.title.trim().toLowerCase()}|${entry.content
        .trim()
        .toLowerCase()}`;
      if (seen.has(fingerprint)) {
        duplicates += 1;
      } else {
        seen.add(fingerprint);
      }
    }
    return duplicates;
  }, [entries]);
  const hasBrandSetup = useMemo(
    () =>
      Boolean(brandProfile.brandName.trim()) &&
      (Boolean(brandProfile.websiteUrl.trim()) || Boolean(brandProfile.context.trim())),
    [brandProfile]
  );
  const hasLearnedData = activeEntries.length > 0;
  const hasTested = Boolean(testReply.trim());
  const workflowProgress = (hasBrandSetup ? 1 : 0) + (hasLearnedData ? 1 : 0) + (hasTested ? 1 : 0);
  const workflowProgressPercent = Math.round((workflowProgress / 3) * 100);

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
      await loadCrawlHistory();
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

  const onIngestLinks = async () => {
    const sourceUrls = ingestUrls.trim() || brandProfile.websiteUrl.trim();
    if (!sourceUrls) return;
    setIngesting(true);
    setIngestReport("");
    setIngestDetails([]);
    try {
      const response = await fetch("/api/brand-knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          urls: sourceUrls,
          crawlSite,
          maxPagesPerSite,
          crawlStrategy
        })
      });
      const payload = (await response.json()) as {
        successCount?: number;
        failedCount?: number;
        totals?: {
          pagesCrawled?: number;
          entriesCreated?: number;
          entriesUpdated?: number;
          entriesSkipped?: number;
          productsCreated?: number;
          productsUpdated?: number;
        };
        strategyUsed?: "balanced" | "products-first" | "support-first";
        results?: Array<{
          url: string;
          ok: boolean;
          error?: string;
          pagesCrawled?: number;
          entriesCreated?: number;
          entriesUpdated?: number;
          entriesSkipped?: number;
          productsCreated?: number;
          productsUpdated?: number;
        }>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? tr("knowledge.ingestFailed", "Link ingestion failed"));
      }
      const failed = (payload.results ?? []).filter((item) => !item.ok);
      setIngestDetails(payload.results ?? []);
      setIngestReport(
        `${tr("knowledge.ingestSuccess", "Ingested")}: ${payload.successCount ?? 0} | ${tr(
          "knowledge.ingestFailedCount",
          "Failed"
        )}: ${payload.failedCount ?? 0} | ${tr("knowledge.strategy", "Strategy")}: ${
          payload.strategyUsed ?? crawlStrategy
        } | ${tr("knowledge.pagesCrawled", "Pages crawled")}: ${
          payload.totals?.pagesCrawled ?? 0
        } | ${tr("common.create", "Create")}: ${payload.totals?.entriesCreated ?? 0} | ${tr(
          "common.update",
          "Update"
        )}: ${payload.totals?.entriesUpdated ?? 0} | ${tr("knowledge.skipped", "Skipped")}: ${
          payload.totals?.entriesSkipped ?? 0
        } | ${tr("products.addProduct", "Products")}: +${payload.totals?.productsCreated ?? 0}/~${
          payload.totals?.productsUpdated ?? 0
        }${failed.length ? ` | ${failed[0].url}: ${failed[0].error ?? "error"}` : ""}`
      );
      await loadEntries();
    } catch (error) {
      setIngestReport(
        error instanceof Error
          ? error.message
          : tr("knowledge.ingestFailed", "Link ingestion failed")
      );
    } finally {
      setIngesting(false);
    }
  };

  const onDedupeExisting = async () => {
    setDeduping(true);
    setDedupeReport("");
    try {
      const response = await fetch("/api/brand-knowledge/dedupe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId })
      });
      const payload = (await response.json().catch(() => ({}))) as {
        removed?: number;
        remaining?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? tr("knowledge.dedupeFailed", "Failed to deduplicate entries."));
      }
      setDedupeReport(
        `${tr("knowledge.dedupeDone", "Deduplication done")}: ${tr(
          "knowledge.removed",
          "Removed"
        )} ${payload.removed ?? 0}, ${tr("knowledge.remaining", "Remaining")} ${payload.remaining ?? 0}.`
      );
      await loadEntries();
    } catch (error) {
      setDedupeReport(
        error instanceof Error
          ? error.message
          : tr("knowledge.dedupeFailed", "Failed to deduplicate entries.")
      );
    } finally {
      setDeduping(false);
    }
  };

  const onSaveBrandProfile = async () => {
    setProfileSaving(true);
    setProfileReport("");
    try {
      const response = await fetch("/api/brand-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          brandName: brandProfile.brandName,
          websiteUrl: brandProfile.websiteUrl,
          instagram: brandProfile.instagram,
          defaultMode: brandProfile.defaultMode,
          context: brandProfile.context
        })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? tr("settings.saveFailed", "Failed to save settings."));
      }
      await loadBrandProfile();
      setProfileReport(tr("settings.savedSuccessfully", "Settings saved successfully."));
    } catch (error) {
      setProfileReport(
        error instanceof Error ? error.message : tr("settings.saveFailed", "Failed to save settings.")
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const onTestBrandAssistant = async () => {
    if (!testPrompt.trim()) return;
    setTesting(true);
    setTestReply("");
    setTestMeta(null);
    try {
      const response = await fetch("/api/chat/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          prompt: testPrompt.trim(),
          language: testLanguage,
          mode: testMode
        })
      });
      const payload = (await response.json()) as {
        reply?: string;
        meta?: { provider?: string; model?: string };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? tr("workspace.failedGenerateReply", "Failed to generate reply"));
      }
      setTestReply(payload.reply ?? tr("workspace.noResponseProvider", "No response from provider."));
      setTestMeta(payload.meta ?? null);
    } catch (error) {
      setTestReply(error instanceof Error ? error.message : tr("workspace.generationFailed", "Generation failed"));
    } finally {
      setTesting(false);
    }
  };

  const onSendPopupMessage = async () => {
    const message = popupInput.trim();
    if (!message || popupSending) return;
    const userId = `u-${Date.now()}`;
    const aiId = `a-${Date.now()}`;
    setPopupMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: message },
      { id: aiId, role: "assistant", content: tr("workspace.generating", "Generating...") }
    ]);
    setPopupInput("");
    setPopupSending(true);
    try {
      const response = await fetch("/api/chat/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          prompt: message,
          language: testLanguage,
          mode: testMode
        })
      });
      const payload = (await response.json()) as { reply?: string; error?: string };
      const text = response.ok ? payload.reply ?? "No response." : payload.error ?? "Failed";
      setPopupMessages((prev) => prev.map((item) => (item.id === aiId ? { ...item, content: text } : item)));
    } finally {
      setPopupSending(false);
    }
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

      <section className="premium-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">
              {tr("knowledge.workflowTitle", "Brand assistant workflow")}
            </h2>
            <p className="text-sm text-secondary">
              {tr(
                "knowledge.workflowDescription",
                "Follow these steps: set brand profile, crawl links, then validate with chat test."
              )}
            </p>
          </div>
          <div className="min-w-[220px] rounded-xl border border-border/70 bg-elevated/20 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted">
              {tr("knowledge.workflowProgress", "Workflow progress")}
            </p>
            <p className="mt-0.5 text-sm font-semibold">{workflowProgressPercent}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/70">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${workflowProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setActiveFlowStep("setup")}
            className={`rounded-xl border p-3 text-left transition ${
              activeFlowStep === "setup"
                ? "border-accent/40 bg-accent/10"
                : "border-border/70 bg-elevated/20 hover:border-accent/25"
            }`}
          >
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
              {hasBrandSetup ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              1. {tr("knowledge.stepSetup", "Setup")}
            </p>
            <p className="mt-1 text-sm font-medium">
              {hasBrandSetup
                ? tr("knowledge.setupDone", "Brand profile configured")
                : tr("knowledge.setupPending", "Brand profile not complete")}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveFlowStep("learn")}
            className={`rounded-xl border p-3 text-left transition ${
              activeFlowStep === "learn"
                ? "border-accent/40 bg-accent/10"
                : "border-border/70 bg-elevated/20 hover:border-accent/25"
            }`}
          >
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
              {hasLearnedData ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              2. {tr("knowledge.stepLearn", "Learn")}
            </p>
            <p className="mt-1 text-sm font-medium">
              {hasLearnedData
                ? tr("knowledge.learnDone", "Knowledge entries available")
                : tr("knowledge.learnPending", "No active learned entries yet")}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setActiveFlowStep("test")}
            className={`rounded-xl border p-3 text-left transition ${
              activeFlowStep === "test"
                ? "border-accent/40 bg-accent/10"
                : "border-border/70 bg-elevated/20 hover:border-accent/25"
            }`}
          >
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
              {hasTested ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              3. {tr("knowledge.stepTest", "Test")}
            </p>
            <p className="mt-1 text-sm font-medium">
              {hasTested
                ? tr("knowledge.testDone", "Assistant tested")
                : tr("knowledge.testPending", "Run a quick chat test")}
            </p>
          </button>
        </div>
      </section>

      {activeFlowStep === "setup" && (
      <section className="premium-panel p-4">
        <h2 className="text-lg font-medium">{tr("knowledge.brandSetup", "Step 1: Brand setup")}</h2>
        <p className="mt-1 text-sm text-secondary">
          {tr(
            "knowledge.brandSetupDescription",
            "Create your brand profile once. Crawling and chatbot testing will use this context automatically."
          )}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input
            value={brandProfile.brandName}
            onChange={(event) => setBrandProfile((prev) => ({ ...prev, brandName: event.target.value }))}
            placeholder={tr("knowledge.brandName", "Brand name")}
          />
          <Input
            value={brandProfile.websiteUrl}
            onChange={(event) => setBrandProfile((prev) => ({ ...prev, websiteUrl: event.target.value }))}
            placeholder={tr("knowledge.websiteUrl", "Website URL")}
          />
          <Input
            value={brandProfile.instagram}
            onChange={(event) => setBrandProfile((prev) => ({ ...prev, instagram: event.target.value }))}
            placeholder={tr("knowledge.instagram", "Instagram handle/link")}
          />
          <select
            value={brandProfile.defaultMode}
            onChange={(event) =>
              setBrandProfile((prev) => ({
                ...prev,
                defaultMode: event.target.value as BrandProfile["defaultMode"]
              }))
            }
            className="h-10 rounded-md border border-border/70 bg-elevated/30 px-3 text-sm"
          >
            <option value="general">General Assistant</option>
            <option value="support">Support Assistant</option>
            <option value="sales">Sales Assistant</option>
            <option value="marketing">Marketing Assistant</option>
            <option value="tunisian-assistant">Tunisian Assistant</option>
          </select>
        </div>
        <Textarea
          value={brandProfile.context}
          onChange={(event) => setBrandProfile((prev) => ({ ...prev, context: event.target.value }))}
          className="mt-2 min-h-[110px]"
          placeholder={tr(
            "knowledge.brandContext",
            "Brand context: products, tone, shipping, returns, payment, audience, contact style..."
          )}
        />
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => void onSaveBrandProfile()} disabled={profileSaving}>
            {profileSaving ? tr("common.saving", "Saving...") : tr("common.save", "Save")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (brandProfile.websiteUrl.trim()) {
                setIngestUrls(brandProfile.websiteUrl.trim());
              }
            }}
          >
            {tr("knowledge.useWebsiteForCrawl", "Use website URL in crawler")}
          </Button>
        </div>
        {!!profileReport && <p className="mt-2 text-xs text-muted">{profileReport}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setBrandProfile((prev) => ({
                ...prev,
                context:
                  prev.context ||
                  "Tone: premium and reassuring. Delivery: Tunisia-wide 24-72h. Returns: accepted within 7 days for eligible items. Payments: cash on delivery and card."
              }))
            }
          >
            {tr("knowledge.fillContextTemplate", "Fill context template")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveFlowStep("learn")}>
            {tr("knowledge.nextLearn", "Next: Crawl and learn")}
          </Button>
        </div>
      </section>
      )}

      {activeFlowStep === "learn" && (
      <section className="space-y-4">
        <article className="premium-panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">{tr("knowledge.learningStatus", "Learning status")}</h2>
              <p className="mt-1 text-sm text-secondary">
                {tr(
                  "knowledge.learningStatusDescription",
                  "This shows what your assistant currently knows from active brand entries."
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={duplicateEstimate > 0 ? "default" : "accent"}>
                {tr("knowledge.duplicateEstimate", "Duplicate candidates")}: {duplicateEstimate}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => void onDedupeExisting()} disabled={deduping}>
                {deduping ? tr("knowledge.deduping", "Cleaning...") : tr("knowledge.dedupeNow", "Clean duplicates")}
              </Button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {categoryCounts.map((item) => (
              <div key={item.category} className="premium-subpanel px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted">{item.category}</p>
                <p className="text-lg font-semibold">{item.count}</p>
              </div>
            ))}
            <div className="premium-subpanel border-accent/30 bg-accent/10 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted">
                {tr("knowledge.totalActiveEntries", "Total active")}
              </p>
              <p className="text-lg font-semibold">{activeEntries.length}</p>
            </div>
          </div>
          {!!dedupeReport && <p className="mt-2 text-xs text-muted">{dedupeReport}</p>}
        </article>
        <article className="premium-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-medium">{tr("knowledge.crawlHistory", "Crawl history")}</h3>
            <Badge variant="default">{tr("knowledge.lastRuns", "Last 10 runs")}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {!crawlHistory.length && (
              <p className="text-xs text-muted">
                {tr("knowledge.noCrawlHistory", "No crawl runs yet. Start your first crawl to see history.")}
              </p>
            )}
            {crawlHistory.map((run) => (
              <article key={run.id} className="premium-subpanel p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {tr("knowledge.strategy", "Strategy")}: {run.strategyUsed}
                    {run.requestedStrategy ? ` (${tr("knowledge.requested", "requested")}: ${run.requestedStrategy})` : ""}
                  </p>
                  <p className="text-xs text-muted">{new Date(run.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-1 text-xs text-secondary">
                  {tr("knowledge.pagesCrawled", "Pages crawled")}: {run.pagesCrawled} | {tr("common.create", "Create")}
                  : {run.entriesCreated} | {tr("common.update", "Update")}: {run.entriesUpdated} |{" "}
                  {tr("knowledge.skipped", "Skipped")}: {run.entriesSkipped}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {tr("products.addProduct", "Products")}: +{run.productsCreated}/~{run.productsUpdated} |{" "}
                  {tr("knowledge.ingestSuccess", "Ingested")}: {run.successCount} |{" "}
                  {tr("knowledge.ingestFailedCount", "Failed")}: {run.failedCount}
                </p>
              </article>
            ))}
          </div>
        </article>
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

            <div className="mt-5 rounded-xl border border-border/70 bg-elevated/20 p-3">
              <p className="text-sm font-semibold">
                {tr("knowledge.linkIngestion", "Learn from website/social links")}
              </p>
              <Textarea
                value={ingestUrls}
                onChange={(event) => setIngestUrls(event.target.value)}
                className="mt-2 min-h-[90px]"
                placeholder={tr(
                  "knowledge.linkIngestionPlaceholder",
                  "Paste one URL per line (website pages, product pages, social profile links)"
                )}
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-secondary">
                  <input
                    type="checkbox"
                    checked={crawlSite}
                    onChange={(event) => setCrawlSite(event.target.checked)}
                  />
                  {tr("knowledge.crawlWholeSite", "Crawl internal pages")}
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-secondary">
                  {tr("knowledge.maxPages", "Max pages")}
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxPagesPerSite}
                    onChange={(event) => setMaxPagesPerSite(Number(event.target.value || 10))}
                    className="h-8 w-16 rounded-md border border-border/70 bg-elevated/30 px-2"
                  />
                </label>
              <label className="inline-flex items-center gap-2 text-xs text-secondary">
                {tr("knowledge.crawlStrategy", "Strategy")}
                <select
                  value={crawlStrategy}
                  onChange={(event) =>
                    setCrawlStrategy(
                      event.target.value as "auto" | "balanced" | "products-first" | "support-first"
                    )
                  }
                  className="h-8 rounded-md border border-border/70 bg-elevated/30 px-2"
                >
                  <option value="auto">{tr("knowledge.crawlStrategyAuto", "Auto")}</option>
                  <option value="balanced">
                    {tr("knowledge.crawlStrategyBalanced", "Balanced")}
                  </option>
                  <option value="products-first">
                    {tr("knowledge.crawlStrategyProducts", "Products first")}
                  </option>
                  <option value="support-first">
                    {tr("knowledge.crawlStrategySupport", "Support first")}
                  </option>
                </select>
              </label>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" onClick={() => void onIngestLinks()} disabled={ingesting}>
                  {ingesting
                    ? tr("knowledge.ingesting", "Ingesting...")
                    : tr("knowledge.ingestLinks", "Ingest links")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setActiveFlowStep("test")}>
                  {tr("knowledge.nextTest", "Next: Test assistant")}
                </Button>
                {!!ingestReport && <p className="text-xs text-muted">{ingestReport}</p>}
              </div>
              {!!ingestDetails.length && (
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/70 bg-elevated/15 p-2">
                  {ingestDetails.map((item) => (
                    <p key={`${item.url}-${item.ok ? "ok" : "err"}`} className="text-xs text-secondary">
                      {item.ok
                        ? `${item.url} -> pages:${item.pagesCrawled ?? 0}, entries:+${item.entriesCreated ?? 0}/~${item.entriesUpdated ?? 0}/=${item.entriesSkipped ?? 0}, products:+${item.productsCreated ?? 0}/~${item.productsUpdated ?? 0}`
                        : `${item.url} -> ${item.error ?? "failed"}`}
                    </p>
                  ))}
                </div>
              )}
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
                      <Badge variant={entry.isActive ? "accent" : "default"}>
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
      </section>
      )}

      {activeFlowStep === "test" && (
      <section className="grid gap-4 xl:grid-cols-1">
        <article className="premium-panel p-4">
          <h2 className="text-lg font-medium">
            {tr("knowledge.brandChatTester", "Brand chat tester")}
          </h2>
          <p className="mt-1 text-sm text-secondary">
            {tr(
              "knowledge.brandChatTesterDescription",
              "Ask a question as a customer and verify the assistant uses your learned brand data."
            )}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <select
              value={testLanguage}
              onChange={(event) => setTestLanguage(event.target.value as typeof testLanguage)}
              className="h-10 rounded-md border border-border/70 bg-elevated/30 px-3 text-sm"
            >
              <option value="fr">French</option>
              <option value="darija">Darija</option>
              <option value="ar">Arabic</option>
              <option value="en">English</option>
            </select>
            <select
              value={testMode}
              onChange={(event) => setTestMode(event.target.value as typeof testMode)}
              className="h-10 rounded-md border border-border/70 bg-elevated/30 px-3 text-sm sm:col-span-2"
            >
              <option value="general">General Assistant</option>
              <option value="support">Support Assistant</option>
              <option value="sales">Sales Assistant</option>
              <option value="marketing">Marketing Assistant</option>
              <option value="tunisian-assistant">Tunisian Assistant</option>
            </select>
          </div>
          <Textarea
            value={testPrompt}
            onChange={(event) => setTestPrompt(event.target.value)}
            className="mt-2 min-h-[90px]"
            placeholder={tr(
              "knowledge.testPromptPlaceholder",
              "Example: What are your delivery and return conditions in Tunisia?"
            )}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTestPrompt("What are your delivery and return conditions in Tunisia?")}
            >
              {tr("knowledge.quickTestSupport", "Quick support test")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setTestPrompt("Recommend 2 best products for a premium gift with short reasons.")
              }
            >
              {tr("knowledge.quickTestProducts", "Quick product test")}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void onTestBrandAssistant()} disabled={testing}>
                {testing ? tr("workspace.generating", "Generating...") : tr("knowledge.testNow", "Test now")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPopupOpen(true)}>
                {tr("knowledge.openPopupPreview", "Open popup preview")}
              </Button>
            </div>
            {testMeta?.provider && (
              <p className="text-xs text-muted">
                {testMeta.provider}/{testMeta.model ?? "default"}
              </p>
            )}
          </div>
          <div className="mt-3 rounded-xl border border-border/70 bg-elevated/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted">
              {tr("knowledge.assistantReply", "Assistant reply")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">
              {testReply || tr("knowledge.noReplyYet", "No test reply yet.")}
            </p>
          </div>
        </article>
      </section>
      )}

      {popupOpen && (
        <div className="fixed inset-0 z-[120] bg-black/30 p-4">
          <div className="ml-auto mt-auto flex h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-sm font-semibold">{brandProfile.brandName || "Brand"} Chat Preview</p>
              <Button size="sm" variant="outline" onClick={() => setPopupOpen(false)}>
                {tr("common.close", "Close")}
              </Button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {!popupMessages.length && (
                <p className="text-xs text-muted">
                  {tr("knowledge.popupHint", "Type a message to simulate the website popup chatbot.")}
                </p>
              )}
              {popupMessages.map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[90%] rounded-xl border px-3 py-2 text-sm ${
                    item.role === "user"
                      ? "ml-auto border-accent/40 bg-accent/10"
                      : "border-border/70 bg-elevated/20"
                  }`}
                >
                  {item.content}
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <Textarea
                value={popupInput}
                onChange={(event) => setPopupInput(event.target.value)}
                className="min-h-[74px]"
                placeholder={tr("common.typeMessage", "Type message...")}
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={() => void onSendPopupMessage()} disabled={popupSending}>
                  {popupSending ? tr("common.sending", "Sending...") : tr("common.send", "Send")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
