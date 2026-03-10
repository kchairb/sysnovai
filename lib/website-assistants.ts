import { type SysnovaLanguage } from "@/lib/ai/types";

export interface WebsiteAssistantConfig {
  id: string;
  name: string;
  workspaceId: string;
  domains: string[];
  defaultLanguage: SysnovaLanguage;
}

export const websiteAssistants: WebsiteAssistantConfig[] = [
  {
    id: "collection-prestige",
    name: "Collection Prestige",
    workspaceId: "workspace-collection-prestige",
    domains: ["collectionprestige.tn", "www.collectionprestige.tn"],
    defaultLanguage: "fr"
  },
  {
    id: "shomokh-store",
    name: "Shomokh Store",
    workspaceId: "workspace-shomokh-store",
    domains: ["shomokhstore.com", "www.shomokhstore.com"],
    defaultLanguage: "ar"
  }
];

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

export function findWebsiteAssistantByDomain(domain: string) {
  const normalized = normalizeDomain(domain);
  return websiteAssistants.find((assistant) =>
    assistant.domains.some((entry) => normalizeDomain(entry) === normalized)
  );
}

export function isAllowedOrigin(origin: string | null, assistant: WebsiteAssistantConfig) {
  if (!origin) return false;
  try {
    const host = new URL(origin).host.toLowerCase().replace(/^www\./, "");
    return assistant.domains.some(
      (entry) => entry.toLowerCase().replace(/^www\./, "") === host
    );
  } catch {
    return false;
  }
}
