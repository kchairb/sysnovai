import { upsertBrandProfile } from "@/lib/server/brand-profile";
import {
  createBrandKnowledgeEntry,
  listBrandKnowledgeEntries,
  updateBrandKnowledgeEntry
} from "@/lib/server/brand-knowledge";
import { createWorkspaceProduct, listWorkspaceProducts } from "@/lib/server/product-store";

export type BrandBootstrapInput = {
  workspaceId: string;
  brandName: string;
  websiteUrl?: string;
  instagram?: string;
  defaultMode?: "general" | "support" | "sales" | "marketing" | "tunisian-assistant";
  context?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsapp?: string;
  address?: string;
  shippingInfo?: string;
  returnPolicy?: string;
  paymentMethods?: string;
  keyProducts?: string;
};

export async function bootstrapBrandWorkspace(input: BrandBootstrapInput) {
  const baseContextParts = [
    input.context?.trim() || "",
    input.contactPhone?.trim() ? `Phone: ${input.contactPhone.trim()}` : "",
    input.contactEmail?.trim() ? `Email: ${input.contactEmail.trim()}` : "",
    input.whatsapp?.trim() ? `WhatsApp: ${input.whatsapp.trim()}` : "",
    input.address?.trim() ? `Address: ${input.address.trim()}` : "",
    input.shippingInfo?.trim() ? `Shipping: ${input.shippingInfo.trim()}` : "",
    input.returnPolicy?.trim() ? `Returns: ${input.returnPolicy.trim()}` : "",
    input.paymentMethods?.trim() ? `Payments: ${input.paymentMethods.trim()}` : ""
  ].filter(Boolean);

  const profile = await upsertBrandProfile({
    workspaceExternalId: input.workspaceId,
    brandName: input.brandName,
    websiteUrl: input.websiteUrl,
    instagram: input.instagram,
    defaultMode: input.defaultMode,
    context: baseContextParts.join("\n")
  });

  const existingEntries = await listBrandKnowledgeEntries({
    workspaceId: input.workspaceId,
    includeInactive: true,
    limit: 500
  }).catch(() => []);
  const existingProducts = await listWorkspaceProducts({
    workspaceId: input.workspaceId,
    includeInactive: true,
    limit: 500
  }).catch(() => []);

  const knowledgeSeeds: Array<{
    category: "brand" | "faq" | "policy" | "document" | "product";
    title: string;
    content: string;
    tags: string[];
  }> = [
    {
      category: "brand",
      title: `${input.brandName} - Brand profile`,
      content: [
        `Brand: ${input.brandName}`,
        input.websiteUrl ? `Website: ${input.websiteUrl}` : "",
        input.instagram ? `Instagram: ${input.instagram}` : "",
        input.address ? `Address: ${input.address}` : "",
        input.contactPhone ? `Phone: ${input.contactPhone}` : "",
        input.contactEmail ? `Email: ${input.contactEmail}` : "",
        input.whatsapp ? `WhatsApp: ${input.whatsapp}` : "",
        input.context ? `Context: ${input.context}` : ""
      ]
        .filter(Boolean)
        .join("\n"),
      tags: ["starter-kit", "brand", "profile"]
    },
    {
      category: "policy",
      title: "Shipping and delivery policy",
      content:
        input.shippingInfo?.trim() ||
        "Delivery policy placeholder. Define zones, timelines, and delivery costs for Tunisia and international orders.",
      tags: ["starter-kit", "shipping", "delivery"]
    },
    {
      category: "policy",
      title: "Return and exchange policy",
      content:
        input.returnPolicy?.trim() ||
        "Returns policy placeholder. Define eligible conditions, timeframe, and process for exchange/refund.",
      tags: ["starter-kit", "returns", "refunds"]
    },
    {
      category: "faq",
      title: "Customer contact and support channels",
      content: [
        input.contactPhone ? `Phone support: ${input.contactPhone}` : "",
        input.contactEmail ? `Email support: ${input.contactEmail}` : "",
        input.whatsapp ? `WhatsApp support: ${input.whatsapp}` : "",
        input.instagram ? `Instagram: ${input.instagram}` : "",
        "Support hours: (set your real working hours here)."
      ]
        .filter(Boolean)
        .join("\n"),
      tags: ["starter-kit", "support", "contact"]
    },
    {
      category: "document",
      title: "Payment methods and order flow",
      content:
        input.paymentMethods?.trim() ||
        "Payment methods placeholder. Include COD/card/wallet and order confirmation workflow.",
      tags: ["starter-kit", "payments", "checkout"]
    }
  ];

  let knowledgeCreated = 0;
  let knowledgeUpdated = 0;
  let knowledgeSkipped = 0;
  for (const seed of knowledgeSeeds) {
    const existing = existingEntries.find(
      (entry) =>
        entry.category === seed.category &&
        entry.title.trim().toLowerCase() === seed.title.trim().toLowerCase()
    );
    if (!existing) {
      await createBrandKnowledgeEntry({
        workspaceId: input.workspaceId,
        category: seed.category,
        title: seed.title,
        content: seed.content,
        tags: seed.tags
      });
      knowledgeCreated += 1;
      continue;
    }
    await updateBrandKnowledgeEntry({
      id: existing.id,
      workspaceId: input.workspaceId,
      content: seed.content,
      tags: seed.tags,
      isActive: true
    });
    knowledgeUpdated += 1;
  }

  const parsedProducts = (input.keyProducts ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);

  let productsCreated = 0;
  let productsSkipped = 0;
  for (const productName of parsedProducts) {
    const exists = existingProducts.some(
      (product) => product.name.trim().toLowerCase() === productName.trim().toLowerCase()
    );
    if (exists) {
      productsSkipped += 1;
      continue;
    }
    await createWorkspaceProduct({
      workspaceId: input.workspaceId,
      name: productName,
      category: "catalog",
      description: `Seeded from brand starter kit for ${input.brandName}`,
      tags: ["starter-kit", "seed-product"]
    });
    productsCreated += 1;
  }

  knowledgeSkipped = Math.max(0, knowledgeSeeds.length - knowledgeCreated - knowledgeUpdated);

  return {
    profile,
    stats: {
      knowledgeCreated,
      knowledgeUpdated,
      knowledgeSkipped,
      productsCreated,
      productsSkipped
    }
  };
}
