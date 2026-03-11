import { catalogProducts, knowledgeItems, workspaceFaqs } from "@/lib/mock-data";
import { type RagRequest, type RetrievedContext } from "@/lib/ai/types";
import { tunisianLifeKnowledge } from "@/lib/tunisian-life-knowledge";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { getBrandProfile } from "@/lib/server/brand-profile";
import {
  listBrandKnowledgeEntries,
  type BrandKnowledgeEntryRecord
} from "@/lib/server/brand-knowledge";

const workspacePolicies = [
  "Returns accepted within 7 days for unopened items.",
  "Nationwide delivery usually takes 24h to 48h.",
  "Cash on delivery and card payments are available."
];

const workspaceDocuments = [
  "Operations handbook for customer support tone and escalation.",
  "Q1 growth strategy with campaign messaging for Tunisian audiences."
];

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function hasAnyToken(query: string, tokens: string[]) {
  return tokens.some((token) => query.includes(token));
}

function scoreByQueryMatch(query: string, text: string) {
  const normalizedText = text.toLowerCase();
  const tokens = query.split(/\s+/).filter((token) => token.length > 1);
  if (!tokens.length) return 0;
  return tokens.reduce((sum, token) => sum + (normalizedText.includes(token) ? 1 : 0), 0);
}

export async function retrieveContext(input: RagRequest): Promise<RetrievedContext> {
  const query = normalize(input.message);
  const workspaceContext = getWorkspaceContext(input.workspaceId);
  const brandProfile = await getBrandProfile(input.workspaceId).catch(() => null);
  const brandEntries: BrandKnowledgeEntryRecord[] = await listBrandKnowledgeEntries({
    workspaceId: input.workspaceId,
    includeInactive: false,
    search: undefined,
    limit: 120
  }).catch(() => [] as BrandKnowledgeEntryRecord[]);
  const matchedBrandEntries = [...brandEntries]
    .map((entry) => ({
      entry,
      score: scoreByQueryMatch(query, `${entry.title} ${entry.content} ${entry.tags.join(" ")}`)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.entry);
  const selectedBrandEntries = matchedBrandEntries.length
    ? matchedBrandEntries.slice(0, 16)
    : brandEntries.slice(0, 10);
  const brandFaqs = selectedBrandEntries
    .filter((entry) => entry.category === "faq")
    .map((entry) => `${entry.title}: ${entry.content}`);
  const brandPolicies = selectedBrandEntries
    .filter((entry) => entry.category === "policy")
    .map((entry) => `${entry.title}: ${entry.content}`);
  const brandProducts = selectedBrandEntries
    .filter((entry) => entry.category === "product")
    .map((entry) => `${entry.title}: ${entry.content}`);
  const brandDocuments = selectedBrandEntries
    .filter((entry) => entry.category === "document" || entry.category === "brand")
    .map((entry) => `${entry.title}: ${entry.content}`);
  if (brandProfile?.context) {
    brandDocuments.unshift(`Brand context: ${brandProfile.context}`);
  }
  if (brandProfile?.websiteUrl) {
    brandDocuments.unshift(`Website: ${brandProfile.websiteUrl}`);
  }
  if (brandProfile?.instagram) {
    brandDocuments.unshift(`Instagram: ${brandProfile.instagram}`);
  }
  const sourceFaqs = workspaceContext.faqs.length ? workspaceContext.faqs : workspaceFaqs;
  const sourcePolicies = workspaceContext.policies.length
    ? workspaceContext.policies
    : workspacePolicies;
  const sourceProducts = workspaceContext.products;
  const sourceDocuments = workspaceContext.documents.length
    ? workspaceContext.documents
    : workspaceDocuments;
  const mergedFaqs = [...brandFaqs, ...sourceFaqs];
  const mergedPolicies = [...brandPolicies, ...sourcePolicies];
  const mergedProducts = [...brandProducts, ...sourceProducts];
  const mergedDocuments = [...brandDocuments, ...sourceDocuments];

  const matchedFaqs = mergedFaqs.filter((faq) =>
    query.split(" ").some((token) => faq.toLowerCase().includes(token))
  );

  const matchedProducts = catalogProducts
    .filter((product) =>
      query.split(" ").some((token) => product.name.toLowerCase().includes(token))
    )
    .map((product) => `${product.name} (${product.price}) - ${product.delivery}`);

  const matchedPolicies = mergedPolicies.filter((policy) =>
    query.split(" ").some((token) => policy.toLowerCase().includes(token))
  );

  const matchedCustomProducts = mergedProducts.filter((product) =>
    query.split(" ").some((token) => product.toLowerCase().includes(token))
  );

  const matchedDocuments = mergedDocuments.filter((doc) =>
    query.split(" ").some((token) => doc.toLowerCase().includes(token))
  );

  const fallbackKnowledge = knowledgeItems.slice(0, 2).map((item) => item.title);

  const shoppingTokens = [
    "buy",
    "price",
    "product",
    "gift box",
    "delivery",
    "order",
    "shop",
    "purchase",
    "acheter",
    "prix",
    "commande",
    "produit",
    "cadeau",
    "nchri",
    "nchrih",
    "soum",
    "thaman",
    "8ad",
    "وصل",
    "سعر",
    "شراء",
    "منتج",
    "هدية"
  ];

  const isTunisianPersonalMode = input.mode === "tunisian-assistant";
  const isGeneralMode = input.mode === "general";
  const isShoppingIntent = hasAnyToken(query, shoppingTokens);

  if (isTunisianPersonalMode && !isShoppingIntent) {
    const lifeContext = [
      ...tunisianLifeKnowledge.culture,
      ...tunisianLifeKnowledge.lifestyle,
      ...tunisianLifeKnowledge.gifting,
      ...tunisianLifeKnowledge.practicalAdvice
    ];

    const matchedLifeContext = lifeContext.filter((entry) =>
      query.split(" ").some((token) => entry.toLowerCase().includes(token))
    );

    return {
      faqs: matchedLifeContext.slice(0, 3).length
        ? matchedLifeContext.slice(0, 3)
        : tunisianLifeKnowledge.gifting.slice(0, 2),
      policies: tunisianLifeKnowledge.practicalAdvice.slice(0, 2),
      products: [],
      documents: tunisianLifeKnowledge.culture.slice(0, 2)
    };
  }

  if (isGeneralMode && !isShoppingIntent) {
    return {
      faqs: matchedFaqs.length ? matchedFaqs.slice(0, 2) : [],
      policies: matchedPolicies.length ? matchedPolicies.slice(0, 1) : [],
      products: [],
      documents: matchedDocuments.length ? matchedDocuments.slice(0, 1) : []
    };
  }

  return {
    faqs: matchedFaqs.length ? matchedFaqs : mergedFaqs.slice(0, 2),
    policies: matchedPolicies.length ? matchedPolicies : mergedPolicies.slice(0, 2),
    products:
      matchedProducts.length
        ? matchedProducts
        : matchedCustomProducts.length
          ? matchedCustomProducts
          : mergedProducts.length
            ? mergedProducts.slice(0, 2)
            : fallbackKnowledge,
    documents: matchedDocuments.length ? matchedDocuments : mergedDocuments.slice(0, 1)
  };
}
