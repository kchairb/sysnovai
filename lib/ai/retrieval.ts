import { catalogProducts, knowledgeItems, workspaceFaqs } from "@/lib/mock-data";
import { type RagRequest, type RetrievedContext } from "@/lib/ai/types";
import { tunisianLifeKnowledge } from "@/lib/tunisian-life-knowledge";
import { getWorkspaceContext } from "@/lib/workspace-context";

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

export function retrieveContext(input: RagRequest): RetrievedContext {
  const query = normalize(input.message);
  const workspaceContext = getWorkspaceContext(input.workspaceId);
  const sourceFaqs = workspaceContext.faqs.length ? workspaceContext.faqs : workspaceFaqs;
  const sourcePolicies = workspaceContext.policies.length
    ? workspaceContext.policies
    : workspacePolicies;
  const sourceProducts = workspaceContext.products;
  const sourceDocuments = workspaceContext.documents.length
    ? workspaceContext.documents
    : workspaceDocuments;

  const matchedFaqs = sourceFaqs.filter((faq) =>
    query.split(" ").some((token) => faq.toLowerCase().includes(token))
  );

  const matchedProducts = catalogProducts
    .filter((product) =>
      query.split(" ").some((token) => product.name.toLowerCase().includes(token))
    )
    .map((product) => `${product.name} (${product.price}) - ${product.delivery}`);

  const matchedPolicies = sourcePolicies.filter((policy) =>
    query.split(" ").some((token) => policy.toLowerCase().includes(token))
  );

  const matchedCustomProducts = sourceProducts.filter((product) =>
    query.split(" ").some((token) => product.toLowerCase().includes(token))
  );

  const matchedDocuments = sourceDocuments.filter((doc) =>
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

  return {
    faqs: matchedFaqs.length ? matchedFaqs : sourceFaqs.slice(0, 2),
    policies: matchedPolicies.length ? matchedPolicies : sourcePolicies.slice(0, 2),
    products:
      matchedProducts.length
        ? matchedProducts
        : matchedCustomProducts.length
          ? matchedCustomProducts
          : sourceProducts.length
            ? sourceProducts.slice(0, 2)
            : fallbackKnowledge,
    documents: matchedDocuments.length ? matchedDocuments : sourceDocuments.slice(0, 1)
  };
}
