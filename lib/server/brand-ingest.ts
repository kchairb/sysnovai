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

export type CrawlStrategy = "balanced" | "products-first" | "support-first";
export type BrandAutofillResult = {
  brandName?: string;
  websiteUrl: string;
  instagram?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsapp?: string;
  address?: string;
  shippingInfo?: string;
  returnPolicy?: string;
  paymentMethods?: string;
  keyProducts: string[];
  context: string;
  pagesScanned: number;
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

function extractSectionText(html: string, tagName: "header" | "footer" | "nav") {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  const chunks: string[] = [];
  let match = regex.exec(html);
  while (match) {
    const text = sanitizeText(match[1].replace(/<[^>]+>/g, " "));
    if (text) {
      chunks.push(text);
    }
    match = regex.exec(html);
  }
  return chunks.join(" | ").slice(0, 900);
}

function extractEmails(text: string) {
  const matches = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  return Array.from(new Set(matches.map((item) => item.toLowerCase()))).slice(0, 8);
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function extractPhoneNumbers(text: string) {
  const matches =
    text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g) ?? [];
  const cleaned = matches
    .map((item) => normalizePhone(item))
    .filter((item) => item.length >= 8 && item.length <= 15);
  return Array.from(new Set(cleaned)).slice(0, 10);
}

function extractSocialLinks(html: string, baseUrl: URL) {
  const links = new Set<string>();
  const hrefRegex = /href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null = hrefRegex.exec(html);
  while (match) {
    const href = match[1]?.trim();
    if (!href) {
      match = hrefRegex.exec(html);
      continue;
    }
    try {
      const resolved = new URL(href, baseUrl);
      const host = resolved.hostname.toLowerCase();
      if (
        host.includes("instagram.") ||
        host.includes("facebook.") ||
        host.includes("tiktok.") ||
        host.includes("linkedin.") ||
        host.includes("youtube.") ||
        host.includes("x.com") ||
        host.includes("twitter.")
      ) {
        links.add(resolved.toString());
      }
    } catch {
      // ignore malformed URLs
    }
    match = hrefRegex.exec(html);
  }
  return Array.from(links).slice(0, 12);
}

function collectContactSignals(html: string, url: URL) {
  const headerText = extractSectionText(html, "header");
  const footerText = extractSectionText(html, "footer");
  const navText = extractSectionText(html, "nav");
  const fullText = extractBodyText(html);
  const merged = [headerText, footerText, navText, fullText].filter(Boolean).join(" ");
  const phones = extractPhoneNumbers(merged);
  const emails = extractEmails(merged);
  const socials = extractSocialLinks(html, url);
  return {
    headerText,
    footerText,
    navText,
    phones,
    emails,
    socials
  };
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

function scoreAsProductPage(lowered: string) {
  let score = 0;
  if (
    lowered.includes("/product") ||
    lowered.includes("/products") ||
    lowered.includes("/shop") ||
    lowered.includes("/store") ||
    lowered.includes("/boutique") ||
    lowered.includes("/item")
  ) {
    score += 100;
  }
  return score;
}

function scoreAsSupportPage(lowered: string) {
  let score = 0;
  if (
    lowered.includes("/contact") ||
    lowered.includes("contact-us") ||
    lowered.includes("/support") ||
    lowered.includes("/help") ||
    lowered.includes("/about")
  ) {
    score += 80;
  }
  if (
    lowered.includes("/faq") ||
    lowered.includes("/policy") ||
    lowered.includes("/return") ||
    lowered.includes("/terms") ||
    lowered.includes("/shipping")
  ) {
    score += 55;
  }
  return score;
}

function linkPriorityScore(rawUrl: string, strategy: CrawlStrategy) {
  const lowered = rawUrl.toLowerCase();
  let score = 0;
  const productScore = scoreAsProductPage(lowered);
  const supportScore = scoreAsSupportPage(lowered);

  if (strategy === "products-first") {
    score += productScore * 1.25 + supportScore * 0.8;
  } else if (strategy === "support-first") {
    score += supportScore * 1.25 + productScore * 0.8;
  } else {
    score += productScore + supportScore;
  }

  if (lowered.includes("?page=") || lowered.includes("/page/")) {
    score -= 8;
  }
  return score;
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

function pickFirst(values: string[]) {
  return values.find((item) => item.trim().length > 0);
}

function findPolicySnippet(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  for (const keyword of keywords) {
    const index = lower.indexOf(keyword);
    if (index >= 0) {
      const start = Math.max(0, index - 80);
      const end = Math.min(text.length, index + 220);
      return text.slice(start, end).trim();
    }
  }
  return "";
}

function extractPaymentMethodsFromText(text: string) {
  const lower = text.toLowerCase();
  const methods: string[] = [];
  if (lower.includes("cash on delivery") || lower.includes("cod")) methods.push("Cash on delivery");
  if (lower.includes("card") || lower.includes("visa") || lower.includes("mastercard")) methods.push("Card");
  if (lower.includes("paypal")) methods.push("PayPal");
  if (lower.includes("bank transfer")) methods.push("Bank transfer");
  if (lower.includes("d17")) methods.push("D17");
  return Array.from(new Set(methods));
}

export async function autoFillBrandFromWebsite(input: {
  websiteUrl: string;
  maxPages?: number;
}): Promise<BrandAutofillResult> {
  const parsed = new URL(input.websiteUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are supported.");
  }

  const maxPages = Math.min(Math.max(input.maxPages ?? 8, 1), 20);
  const queue: string[] = [normalizeCrawlUrl(parsed)];
  const visited = new Set<string>();
  const phones = new Set<string>();
  const emails = new Set<string>();
  const socials = new Set<string>();
  const productNames = new Set<string>();
  const shippingSnippets: string[] = [];
  const returnSnippets: string[] = [];
  const paymentSnippets: string[] = [];
  const addresses: string[] = [];
  const brandSignals: string[] = [];
  let pagesScanned = 0;

  while (queue.length && pagesScanned < maxPages) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const pageUrl = new URL(current);
    const html = await fetchHtml(current);
    pagesScanned += 1;

    const title =
      extractTagContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      extractTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
      "";
    const description =
      extractTagContent(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      extractTagContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
      "";
    const body = extractBodyText(html);
    const contact = collectContactSignals(html, pageUrl);

    for (const phone of contact.phones) phones.add(phone);
    for (const email of contact.emails) emails.add(email);
    for (const social of contact.socials) socials.add(social);

    const pathLower = pageUrl.pathname.toLowerCase();
    const isProductLike =
      pathLower.includes("/product") ||
      pathLower.includes("/products") ||
      pathLower.includes("/shop") ||
      pathLower.includes("/store") ||
      pathLower.includes("/item");
    if (isProductLike && title) {
      productNames.add(title.slice(0, 120));
    }

    const shippingSnippet = findPolicySnippet(body, ["shipping", "delivery", "livraison", "توصيل"]);
    if (shippingSnippet) shippingSnippets.push(shippingSnippet);
    const returnSnippet = findPolicySnippet(body, ["return", "refund", "exchange", "retour", "استرجاع"]);
    if (returnSnippet) returnSnippets.push(returnSnippet);
    const paymentSnippet = findPolicySnippet(body, ["payment", "paiement", "cash on delivery", "cod", "دفع"]);
    if (paymentSnippet) paymentSnippets.push(paymentSnippet);
    if (pathLower.includes("/contact") || pathLower.includes("/about")) {
      const addressSnippet = findPolicySnippet(body, ["address", "location", "adresse", "tunisie", "تونس"]);
      if (addressSnippet) addresses.push(addressSnippet);
    }
    if (title) brandSignals.push(title);
    if (description) brandSignals.push(description);

    const links = extractInternalLinks(html, pageUrl);
    links.sort((a, b) => linkPriorityScore(b, "balanced") - linkPriorityScore(a, "balanced"));
    for (const link of links) {
      const normalized = normalizeCrawlUrl(new URL(link));
      if (!visited.has(normalized) && !queue.includes(normalized) && queue.length < maxPages * 3) {
        queue.push(normalized);
      }
    }
  }

  const socialList = Array.from(socials);
  const instagram = socialList.find((item) => item.toLowerCase().includes("instagram"));
  const paymentMethods = extractPaymentMethodsFromText(paymentSnippets.join(" "));
  const context = [
    ...brandSignals.slice(0, 2),
    shippingSnippets[0] ? `Shipping clue: ${shippingSnippets[0]}` : "",
    returnSnippets[0] ? `Returns clue: ${returnSnippets[0]}` : "",
    paymentSnippets[0] ? `Payments clue: ${paymentSnippets[0]}` : "",
    phones.size ? `Phones found: ${Array.from(phones).slice(0, 3).join(", ")}` : "",
    emails.size ? `Emails found: ${Array.from(emails).slice(0, 3).join(", ")}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  return {
    websiteUrl: parsed.toString(),
    instagram,
    contactPhone: pickFirst(Array.from(phones)),
    contactEmail: pickFirst(Array.from(emails)),
    whatsapp: pickFirst(Array.from(phones)),
    address: pickFirst(addresses),
    shippingInfo: pickFirst(shippingSnippets),
    returnPolicy: pickFirst(returnSnippets),
    paymentMethods: paymentMethods.join(", "),
    keyProducts: Array.from(productNames).slice(0, 20),
    context,
    pagesScanned
  };
}

export async function ingestBrandUrls(input: {
  workspaceId: string;
  brandId?: string;
  urls: string[];
  crawlSite?: boolean;
  maxPagesPerSite?: number;
  brandName?: string;
  crawlStrategy?: CrawlStrategy;
}) {
  const urls = input.urls.slice(0, 8);
  const maxPagesPerSite = Math.min(Math.max(input.maxPagesPerSite ?? 10, 1), 50);
  const crawlStrategy = input.crawlStrategy ?? "balanced";
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
        const contacts = collectContactSignals(html, currentParsed);

        const content = [
          input.brandName ? `Brand: ${input.brandName}` : "",
          `Source URL: ${currentParsed.toString()}`,
          metaDescription ? `Summary: ${metaDescription}` : "",
          contacts.headerText ? `Header text: ${contacts.headerText}` : "",
          contacts.footerText ? `Footer text: ${contacts.footerText}` : "",
          contacts.navText ? `Navigation text: ${contacts.navText}` : "",
          contacts.phones.length ? `Phones found: ${contacts.phones.join(", ")}` : "",
          contacts.emails.length ? `Emails found: ${contacts.emails.join(", ")}` : "",
          contacts.socials.length ? `Social links: ${contacts.socials.join(", ")}` : "",
          bodyText ? `Extracted text: ${bodyText}` : ""
        ]
          .filter(Boolean)
          .join("\n\n");

        const upserted = await upsertIngestedBrandKnowledgeEntry({
          workspaceId: input.workspaceId,
          brandId: input.brandId,
          category,
          title: pageTitle.slice(0, 160),
          content,
          sourceUrl: normalizeCrawlUrl(currentParsed),
          tags: [
            currentParsed.hostname,
            category,
            "auto-ingest",
            "crawl",
            contacts.phones.length ? "has-phone" : "",
            contacts.emails.length ? "has-email" : "",
            contacts.socials.length ? "has-social" : "",
            input.brandName || "brand"
          ].filter(Boolean)
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
          const shortDescription = [
            metaDescription,
            contacts.phones.length ? `Phones: ${contacts.phones.join(", ")}` : "",
            contacts.emails.length ? `Emails: ${contacts.emails.join(", ")}` : "",
            bodyText
          ]
            .filter(Boolean)
            .join(" | ")
            .slice(0, 900);
          const upsertedProduct = await upsertIngestedWorkspaceProduct({
            workspaceId: input.workspaceId,
            brandId: input.brandId,
            name: productName || currentParsed.hostname,
            category: "catalog",
            description: shortDescription,
            price: priceText || undefined,
            imageUrl: imageUrl || undefined,
            sourceUrl: normalizeCrawlUrl(currentParsed),
            tags: [
              currentParsed.hostname,
              "crawl",
              "auto-product",
              contacts.phones.length ? "has-phone" : "",
              contacts.emails.length ? "has-email" : "",
              contacts.socials.length ? "has-social" : "",
              input.brandName || "brand"
            ].filter(Boolean)
          });
          if (upsertedProduct.action === "created") {
            productsCreated += 1;
          } else {
            productsUpdated += 1;
          }
        }

        if (input.crawlSite) {
          const internalLinks = extractInternalLinks(html, currentParsed);
          internalLinks.sort(
            (a, b) => linkPriorityScore(b, crawlStrategy) - linkPriorityScore(a, crawlStrategy)
          );
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
          queue.sort((a, b) => linkPriorityScore(b, crawlStrategy) - linkPriorityScore(a, crawlStrategy));
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
