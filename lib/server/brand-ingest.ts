import { createBrandKnowledgeEntry, type BrandKnowledgeCategory } from "@/lib/server/brand-knowledge";

type IngestResult = {
  url: string;
  ok: boolean;
  pagesCrawled?: number;
  entriesCreated?: number;
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

function detectCategoryForUrl(url: URL): BrandKnowledgeCategory {
  const hostCategory = detectCategory(url.hostname);
  if (hostCategory === "brand") return hostCategory;
  const path = url.pathname.toLowerCase();
  if (
    path.includes("/product") ||
    path.includes("/products") ||
    path.includes("/shop") ||
    path.includes("/store") ||
    path.includes("/boutique")
  ) {
    return "product";
  }
  if (path.includes("/policy") || path.includes("/terms") || path.includes("/return")) {
    return "policy";
  }
  if (path.includes("/faq")) {
    return "faq";
  }
  return "document";
}

function extractInternalLinks(html: string, baseUrl: URL) {
  const links = new Set<string>();
  const hrefRegex = /href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null = hrefRegex.exec(html);
  while (match) {
    const href = match[1]?.trim();
    if (!href) {
      match = hrefRegex.exec(html);
      continue;
    }
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      match = hrefRegex.exec(html);
      continue;
    }
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname !== baseUrl.hostname) {
        match = hrefRegex.exec(html);
        continue;
      }
      resolved.hash = "";
      links.add(resolved.toString());
    } catch {
      // ignore malformed URLs
    }
    match = hrefRegex.exec(html);
  }
  return [...links];
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
  crawlSite?: boolean;
  maxPagesPerSite?: number;
  brandName?: string;
}) {
  const urls = input.urls.slice(0, 8);
  const maxPagesPerSite = Math.min(Math.max(input.maxPagesPerSite ?? 10, 1), 50);
  const results: IngestResult[] = [];

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Only http/https URLs are supported.");
      }

      const visited = new Set<string>();
      const queue: string[] = [parsed.toString()];
      let pagesCrawled = 0;
      let entriesCreated = 0;
      let firstEntry:
        | { id: string; title: string; category: BrandKnowledgeCategory }
        | undefined;

      while (queue.length && pagesCrawled < (input.crawlSite ? maxPagesPerSite : 1)) {
        const currentUrl = queue.shift();
        if (!currentUrl || visited.has(currentUrl)) continue;
        visited.add(currentUrl);

        const currentParsed = new URL(currentUrl);
        const html = await fetchHtml(currentParsed.toString());
        pagesCrawled += 1;

        const pageTitle =
          extractTagContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
          extractTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
          currentParsed.hostname;
        const metaDescription =
          extractTagContent(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
          extractTagContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
        const bodyText = extractBodyText(html);
        const category = detectCategoryForUrl(currentParsed);

        const content = [
          input.brandName ? `Brand: ${input.brandName}` : "",
          `Source URL: ${currentParsed.toString()}`,
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
          tags: [currentParsed.hostname, category, "auto-ingest", "crawl", input.brandName || "brand"]
        });
        entriesCreated += 1;
        if (!firstEntry) {
          firstEntry = { id: entry.id, title: entry.title, category: entry.category };
        }

        if (input.crawlSite) {
          const internalLinks = extractInternalLinks(html, currentParsed);
          for (const link of internalLinks) {
            if (!visited.has(link) && !queue.includes(link) && queue.length < maxPagesPerSite * 3) {
              queue.push(link);
            }
          }
        }
      }

      results.push({
        url,
        ok: true,
        pagesCrawled,
        entriesCreated,
        entryId: firstEntry?.id,
        title: firstEntry?.title,
        category: firstEntry?.category
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
