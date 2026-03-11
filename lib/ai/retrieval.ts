import { catalogProducts, knowledgeItems, workspaceFaqs } from "@/lib/mock-data";
import { type RagRequest, type RetrievedContext } from "@/lib/ai/types";
import { tunisianLifeKnowledge } from "@/lib/tunisian-life-knowledge";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { listBrandKnowledgeEntries } from "@/lib/server/brand-knowledge";

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

export async function retrieveContext(input: RagRequest): Promise<RetrievedContext> {
  const query = normalize(input.message);
  const workspaceContext = getWorkspaceContext(input.workspaceId);
  const brandEntries = await listBrandKnowledgeEntries({
    workspaceId: input.workspaceId,
    includeInactive: false,
    search: query,
    limit: 120
  }).catch(() => []);
  const brandFaqs = brandEntries
    .filter((entry) => entry.category === "faq")
    .map((entry) => `${entry.title}: ${entry.content}`);
  const brandPolicies = brandEntries
    .filter((entry) => entry.category === "policy")
    .map((entry) => `${entry.title}: ${entry.content}`);
  const brandProducts = brandEntries
    .filter((entry) => entry.category === "product")
    .map((entry) => `${entry.title}: ${entry.content}`);
  const brandDocuments = brandEntries
    .filter((entry) => entry.category === "document" || entry.category === "brand")
    .map((entry) => `${entry.title}: ${entry.content}`);
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
