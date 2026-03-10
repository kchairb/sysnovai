type WorkspaceContext = {
  faqs: string[];
  policies: string[];
  products: string[];
  documents: string[];
};

const defaultWorkspaceContext: WorkspaceContext = {
  faqs: [
    "How long does delivery take? Usually 24h to 48h inside Tunisia.",
    "Which languages are supported? Darija, Arabic, French, and English."
  ],
  policies: [
    "Returns accepted within 7 days for unopened items.",
    "Cash on delivery and card payments are available."
  ],
  products: [
    "Premium Gift Box - curated items with elegant packaging.",
    "Customer favorites bundle - fast shipping nationwide."
  ],
  documents: ["Support tone guide: warm, concise, trustworthy."]
};

const byWorkspaceId: Record<string, WorkspaceContext> = {
  "workspace-collection-prestige": {
    faqs: [
      "Delivery in Tunisia is usually 24h to 72h depending on location.",
      "Orders are confirmed by WhatsApp/phone before shipping.",
      "Returns are accepted within 7 days for eligible items."
    ],
    policies: [
      "Always mention delivery delay clearly before payment.",
      "Use a premium and respectful tone in French/Arabic when answering customers."
    ],
    products: [
      "Luxury fragrance collection - long-lasting scents for women and men.",
      "Gift-ready premium sets - ideal for events and special occasions."
    ],
    documents: [
      "Brand voice: elegant, premium, and reassuring. Avoid slang unless customer uses it first."
    ]
  },
  "workspace-shomokh-store": {
    faqs: [
      "Delivery is available nationwide with estimated 24h to 72h.",
      "Payment methods include cash on delivery and selected online options.",
      "Customers can request order updates through support chat."
    ],
    policies: [
      "Prioritize clarity for stock availability and delivery cost.",
      "Keep replies practical and short, then offer follow-up help."
    ],
    products: [
      "Best-selling perfumes and lifestyle items for Tunisian customers.",
      "Seasonal offers with bundle discounts and gift recommendations."
    ],
    documents: [
      "Support playbook: answer in Arabic, Darija, or French based on customer language."
    ]
  }
};

export function getWorkspaceContext(workspaceId: string): WorkspaceContext {
  return byWorkspaceId[workspaceId] ?? defaultWorkspaceContext;
}
