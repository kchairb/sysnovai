import {
  type BrandKnowledgeCategory,
  upsertIngestedBrandKnowledgeEntry
} from "@/lib/server/brand-knowledge";
import { upsertIngestedWorkspaceProduct } from "@/lib/server/product-store";

type IngestResult = {
  url: string;
  ok: boolean;
  pagesCrawled?: number;
  entriesCreated?: number;
  entriesUpdated?: number;
  entriesSkipped?: number;
  productsCreated?: number;
  productsUpdated?: number;
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

function extractImageUrl(html: string, baseUrl: URL) {
  const ogImage =
    extractTagContent(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    extractTagContent(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  if (ogImage) {
    try {
      return new URL(ogImage, baseUrl).toString();
    } catch {
      return ogImage;
    }
  }

  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch?.[1]) {
    try {
      return new URL(imgMatch[1], baseUrl).toString();
    } catch {
      return imgMatch[1];
    }
  }
  return "";
}

function extractPriceText(html: string) {
  const candidates = [
    /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["'][^>]*>/i
  ];
  for (const regex of candidates) {
    const value = extractTagContent(html, regex);
    if (value) return value;
  }
  const text = sanitizeText(html.replace(/<[^>]+>/g, " "));
  const priceMatch = text.match(/(\d{1,5}(?:[.,]\d{1,2})?\s?(?:tnd|dt|dinar|eur|\$|usd))/i);
  return priceMatch?.[1] ?? "";
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

function normalizeCrawlUrl(url: URL) {
  const next = new URL(url.toString());
  next.hash = "";
  const paramsToDelete = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid"
  ];
  for (const key of paramsToDelete) {
    next.searchParams.delete(key);
  }
  if (next.pathname !== "/" && next.pathname.endsWith("/")) {
    next.pathname = next.pathname.slice(0, -1);
  }
  return next.toString();
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
      const queue: string[] = [normalizeCrawlUrl(parsed)];
      let pagesCrawled = 0;
      let entriesCreated = 0;
      let entriesUpdated = 0;
      let entriesSkipped = 0;
      let productsCreated = 0;
      let productsUpdated = 0;
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
        const imageUrl = extractImageUrl(html, currentParsed);
        const priceText = extractPriceText(html);

        const content = [
          input.brandName ? `Brand: ${input.brandName}` : "",
          `Source URL: ${currentParsed.toString()}`,
          metaDescription ? `Summary: ${metaDescription}` : "",
          bodyText ? `Extracted text: ${bodyText}` : ""
        ]
          .filter(Boolean)
          .join("\n\n");

        const upserted = await upsertIngestedBrandKnowledgeEntry({
          workspaceId: input.workspaceId,
          category,
          title: pageTitle.slice(0, 160),
          content,
          sourceUrl: normalizeCrawlUrl(currentParsed),
          tags: [currentParsed.hostname, category, "auto-ingest", "crawl", input.brandName || "brand"]
        });
        if (upserted.action === "created") {
          entriesCreated += 1;
        } else if (upserted.action === "updated") {
          entriesUpdated += 1;
        } else {
          entriesSkipped += 1;
        }
        if (!firstEntry) {
          firstEntry = {
            id: upserted.entry.id,
            title: upserted.entry.title,
            category: upserted.entry.category
          };
        }

        if (category === "product") {
          const productName = pageTitle.slice(0, 180);
          const shortDescription = [metaDescription, bodyText].filter(Boolean).join(" | ").slice(0, 900);
          const upsertedProduct = await upsertIngestedWorkspaceProduct({
            workspaceId: input.workspaceId,
            name: productName || currentParsed.hostname,
            category: "catalog",
            description: shortDescription,
            price: priceText || undefined,
            imageUrl: imageUrl || undefined,
            sourceUrl: normalizeCrawlUrl(currentParsed),
            tags: [currentParsed.hostname, "crawl", "auto-product", input.brandName || "brand"]
          });
          if (upsertedProduct.action === "created") {
            productsCreated += 1;
          } else {
            productsUpdated += 1;
          }
        }

        if (input.crawlSite) {
          const internalLinks = extractInternalLinks(html, currentParsed);
          for (const link of internalLinks) {
            const normalizedLink = normalizeCrawlUrl(new URL(link));
            if (
              !visited.has(normalizedLink) &&
              !queue.includes(normalizedLink) &&
              queue.length < maxPagesPerSite * 3
            ) {
              queue.push(normalizedLink);
            }
          }
        }
      }

      results.push({
        url,
        ok: true,
        pagesCrawled,
        entriesCreated,
        entriesUpdated,
        entriesSkipped,
        productsCreated,
        productsUpdated,
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
