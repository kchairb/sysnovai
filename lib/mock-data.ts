import type { LucideIcon } from "lucide-react";
import {
  BotMessageSquare,
  BookOpenText,
  Boxes,
  ShieldCheck,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Settings
} from "lucide-react";

export type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const sidebarItems: SidebarItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Workspace", href: "/dashboard/workspace", icon: MessageSquareText },
  { label: "Knowledge Base", href: "/dashboard/knowledge", icon: BookOpenText },
  { label: "Products", href: "/dashboard/products", icon: Boxes },
  { label: "Marketing Studio", href: "/dashboard/marketing", icon: Megaphone },
  { label: "API", href: "/dashboard/api", icon: KeyRound },
  { label: "Tunisian AI", href: "/dashboard/tunisian-ai", icon: BotMessageSquare },
  { label: "Admin", href: "/dashboard/admin", icon: ShieldCheck },
  { label: "Settings", href: "/dashboard/settings", icon: Settings }
];

export const dashboardStats = [
  { label: "Replies Generated", value: "14,280", trend: "+18.6% vs last month" },
  { label: "Knowledge Items", value: "356", trend: "+42 added this week" },
  { label: "Products Trained", value: "128", trend: "+11 this week" },
  { label: "API Usage", value: "89,442", trend: "7,920 requests today" }
];

export const recentActivity = [
  "Generated 12 support replies in French for Delice Home",
  "Updated FAQ policy about same-day Tunis delivery",
  "Added product: Premium Olive Oil Gift Box",
  "Created API key for internal CRM integration",
  "Generated WhatsApp promo in Darija for weekend offer"
];

export type Conversation = {
  id: string;
  title: string;
  snippet: string;
  updatedAt: string;
  mode: "General" | "Support" | "Sales" | "Marketing" | "Tunisian Assistant";
};

export const conversations: Conversation[] = [
  {
    id: "conv-1",
    title: "Delivery policy clarification",
    snippet: "Need a clear Darija reply for next-day Tunis delivery.",
    updatedAt: "2 min ago",
    mode: "Support"
  },
  {
    id: "conv-2",
    title: "Ramadan campaign ideas",
    snippet: "Generate premium IG captions in French + Darija mix.",
    updatedAt: "28 min ago",
    mode: "Marketing"
  },
  {
    id: "conv-3",
    title: "B2B quote follow-up email",
    snippet: "Formal Arabic response with polite closing.",
    updatedAt: "1 hour ago",
    mode: "Sales"
  },
  {
    id: "conv-4",
    title: "Local market question",
    snippet: "What ad angles convert best in Tunisia for beauty category?",
    updatedAt: "Yesterday",
    mode: "Tunisian Assistant"
  }
];

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export const sampleMessages: Message[] = [
  {
    id: "msg-1",
    role: "user",
    content:
      "Customer asked in Darija if delivery to Sfax is possible in 48h. Write a friendly answer in Darija and French."
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "أكيد، نجموا نوصلولك لصفاقس في ظرف 48 ساعة حسب التوفر.\n\nFR: Oui, nous pouvons livrer à Sfax sous 48h selon la disponibilité. Vous recevrez un message de confirmation avec les détails de suivi dès validation de la commande."
  },
  {
    id: "msg-3",
    role: "user",
    content: "Make it more premium and add trust elements."
  },
  {
    id: "msg-4",
    role: "assistant",
    content:
      "أكيد، يشرّفنا نخدموك! التوصيل لصفاقس يتم خلال 48 ساعة مع متابعة دقيقة للطلب من فريقنا.\n\nFR: Avec plaisir. La livraison vers Sfax est assurée sous 48h, avec confirmation immédiate de votre commande et suivi transparent jusqu'a reception. Votre confiance est notre priorite."
  }
];

export const workspaceProducts = [
  "Premium Olive Oil 750ml",
  "Artisan Harissa Collection",
  "Date Syrup Signature Pack",
  "Organic Skincare Set"
];

export const workspaceFaqs = [
  "Delivery delay by governorate",
  "Cash on delivery policy",
  "Return and exchange process",
  "Wholesale minimum order quantities"
];

export const promptTemplates = [
  "Reply to a customer asking about delivery",
  "Generate a Facebook ad in Darija",
  "Write a formal business email in French",
  "Translate customer message to Arabic",
  "Explain a local process for Tunisian users"
];

export const knowledgeSummary = {
  totalItems: 356,
  faqs: 142,
  policies: 48,
  businessInfo: 63,
  documents: 71,
  notes: 32
};

export const knowledgeItems = [
  {
    id: "kb-1",
    type: "FAQ",
    title: "Do you deliver outside Grand Tunis?",
    topic: "Delivery",
    updatedAt: "2h ago"
  },
  {
    id: "kb-2",
    type: "Policy",
    title: "Return and exchange conditions",
    topic: "Operations",
    updatedAt: "Today"
  },
  {
    id: "kb-3",
    type: "Business Info",
    title: "Brand tone and communication style",
    topic: "Brand",
    updatedAt: "Yesterday"
  },
  {
    id: "kb-4",
    type: "Document",
    title: "2026 Product catalog PDF",
    topic: "Products",
    updatedAt: "2 days ago"
  }
];

export const catalogProducts = [
  {
    id: "prod-1",
    name: "Premium Olive Oil 750ml",
    category: "Food",
    price: "49 TND",
    stock: 84,
    delivery: "24h Tunis · 48h nationwide",
    payment: "COD, Card, D17",
    tags: ["best seller", "gift-ready"]
  },
  {
    id: "prod-2",
    name: "Organic Skincare Set",
    category: "Beauty",
    price: "119 TND",
    stock: 32,
    delivery: "48h nationwide",
    payment: "COD, Card",
    tags: ["premium", "new"]
  },
  {
    id: "prod-3",
    name: "Artisan Harissa Collection",
    category: "Food",
    price: "39 TND",
    stock: 140,
    delivery: "24h major cities",
    payment: "COD, Card",
    tags: ["darija-campaign", "bundle"]
  }
];

export const marketingTemplates = [
  "Product description",
  "Facebook ad",
  "Instagram caption",
  "WhatsApp promo text",
  "Formal business email"
];

export const marketingOutputs = [
  {
    id: "out-1",
    channel: "Facebook ad",
    language: "French",
    tone: "Premium",
    preview:
      "Decouvrez notre collection signature concue pour les clients tunisiens exigeants..."
  },
  {
    id: "out-2",
    channel: "WhatsApp promo",
    language: "Darija",
    tone: "Sales",
    preview: "عرض خاص لهالويكاند! توصيل سريع وخلص كي توصلك الطلبية."
  }
];

export const apiKeys = [
  {
    id: "key-1",
    name: "CRM Integration",
    keyPreview: "sysnova_live_xxxxx8A2",
    createdAt: "2026-03-02",
    lastUsed: "2 min ago",
    status: "active"
  },
  {
    id: "key-2",
    name: "Mobile App",
    keyPreview: "sysnova_live_xxxxx7F1",
    createdAt: "2026-02-20",
    lastUsed: "1 day ago",
    status: "active"
  }
];

export const apiEndpoints = [
  "POST /api/chat/reply",
  "POST /api/marketing/generate",
  "GET /api/products",
  "POST /api/tunisian-assistant/chat"
];

export const tunisianExamples = [
  "Kifeh naktb email rasmi bel franse ?",
  "Chnowa a7sen tari9a bech nbi3 produit online fi Tounes?",
  "Explain this Tunisian admin process in Arabic",
  "Write a polite customer reply in Darija",
  "What are good ad ideas for Tunisian customers?"
];

export const onboardingSteps = [
  "Workspace and business profile",
  "Language and tone preferences",
  "Delivery, payment, and operations",
  "Add first products",
  "Add FAQ knowledge",
  "Finish and open dashboard"
];
