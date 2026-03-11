import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";

type BrandMode = "general" | "support" | "sales" | "marketing" | "tunisian-assistant";

export type BrandProfileRecord = {
  workspaceId: string;
  brandName: string;
  websiteUrl: string;
  instagram: string;
  defaultMode: BrandMode;
  context: string;
  updatedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __sysnovaBrandProfiles: Record<string, BrandProfileRecord> | undefined;
}

function normalizeMode(mode?: string): BrandMode {
  const normalized = mode?.trim().toLowerCase();
  return ["general", "support", "sales", "marketing", "tunisian-assistant"].includes(
    normalized || ""
  )
    ? (normalized as BrandMode)
    : "support";
}

export async function getBrandProfile(workspaceExternalId: string): Promise<BrandProfileRecord> {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await prisma.workspace.upsert({
      where: { externalId: workspaceExternalId },
      update: {},
      create: {
        externalId: workspaceExternalId,
        name: "Sysnova Workspace",
        slug: `workspace-${workspaceExternalId.replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "main"}`
      }
    });
    const profile = await prisma.brandProfile.upsert({
      where: { workspaceId: workspace.id },
      update: {},
      create: {
        workspaceId: workspace.id,
        brandName: "My Brand",
        defaultMode: "support",
        context: ""
      }
    });
    return {
      workspaceId: workspaceExternalId,
      brandName: profile.brandName,
      websiteUrl: profile.websiteUrl ?? "",
      instagram: profile.instagram ?? "",
      defaultMode: normalizeMode(profile.defaultMode),
      context: profile.context ?? "",
      updatedAt: profile.updatedAt.toISOString()
    };
  }

  const profiles = global.__sysnovaBrandProfiles ?? {};
  if (!profiles[workspaceExternalId]) {
    profiles[workspaceExternalId] = {
      workspaceId: workspaceExternalId,
      brandName: "My Brand",
      websiteUrl: "",
      instagram: "",
      defaultMode: "support",
      context: "",
      updatedAt: new Date().toISOString()
    };
    global.__sysnovaBrandProfiles = profiles;
  }
  return profiles[workspaceExternalId];
}

export async function upsertBrandProfile(input: {
  workspaceExternalId: string;
  brandName?: string;
  websiteUrl?: string;
  instagram?: string;
  defaultMode?: string;
  context?: string;
}) {
  const current = await getBrandProfile(input.workspaceExternalId);
  const next = {
    brandName: input.brandName?.trim() || current.brandName,
    websiteUrl: input.websiteUrl?.trim() ?? current.websiteUrl,
    instagram: input.instagram?.trim() ?? current.instagram,
    defaultMode: normalizeMode(input.defaultMode ?? current.defaultMode),
    context: input.context?.trim().slice(0, 6000) ?? current.context
  };

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await prisma.workspace.upsert({
      where: { externalId: input.workspaceExternalId },
      update: {},
      create: {
        externalId: input.workspaceExternalId,
        name: "Sysnova Workspace",
        slug: `workspace-${input.workspaceExternalId.replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "main"}`
      }
    });
    const profile = await prisma.brandProfile.upsert({
      where: { workspaceId: workspace.id },
      update: next,
      create: {
        workspaceId: workspace.id,
        ...next
      }
    });
    return {
      workspaceId: input.workspaceExternalId,
      brandName: profile.brandName,
      websiteUrl: profile.websiteUrl ?? "",
      instagram: profile.instagram ?? "",
      defaultMode: normalizeMode(profile.defaultMode),
      context: profile.context ?? "",
      updatedAt: profile.updatedAt.toISOString()
    } satisfies BrandProfileRecord;
  }

  const profiles = global.__sysnovaBrandProfiles ?? {};
  const updated: BrandProfileRecord = {
    workspaceId: input.workspaceExternalId,
    ...next,
    updatedAt: new Date().toISOString()
  };
  profiles[input.workspaceExternalId] = updated;
  global.__sysnovaBrandProfiles = profiles;
  return updated;
}
