import { createBrandKnowledgeEntry, type BrandKnowledgeCategory } from "@/lib/server/brand-knowledge";

type IngestResult = {
  url: string;
  ok: boolean;
  entryId?: string;
  title?: string;
  category?: BrandKnowledgeCategory;
  error?: string;
};

function sanitizeText(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagContent(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? sanitizeText(match[1]) : "";
}

function extractBodyText(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = withoutScripts.replace(/<[^>]+>/g, " ");
  return sanitizeText(text).slice(0, 3500);
}

function detectCategory(hostname: string): BrandKnowledgeCategory {
  const host = hostname.toLowerCase();
  if (
    host.includes("instagram.") ||
    host.includes("facebook.") ||
    host.includes("tiktok.") ||
    host.includes("x.com") ||
    host.includes("twitter.")
  ) {
    return "brand";
  }
  return "document";
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "SysnovaBot/1.0 (+https://sysnova.ai)"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function ingestBrandUrls(input: {
  workspaceId: string;
  urls: string[];
}) {
  const urls = input.urls.slice(0, 8);
  const results: IngestResult[] = [];

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Only http/https URLs are supported.");
      }

      const html = await fetchHtml(parsed.toString());
      const pageTitle =
        extractTagContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
        extractTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
        parsed.hostname;
      const metaDescription =
        extractTagContent(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
        extractTagContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
      const bodyText = extractBodyText(html);
      const category = detectCategory(parsed.hostname);

      const content = [
        `Source URL: ${parsed.toString()}`,
        metaDescription ? `Summary: ${metaDescription}` : "",
        bodyText ? `Extracted text: ${bodyText}` : ""
      ]
        .filter(Boolean)
        .join("\n\n");

      const entry = await createBrandKnowledgeEntry({
        workspaceId: input.workspaceId,
        category,
        title: pageTitle.slice(0, 160),
        content,
        tags: [parsed.hostname, category, "auto-ingest"]
      });

      results.push({
        url,
        ok: true,
        entryId: entry.id,
        title: entry.title,
        category: entry.category
      });
    } catch (error) {
      results.push({
        url,
        ok: false,
        error: error instanceof Error ? error.message : "Ingestion failed"
      });
    }
  }

  return results;
}
