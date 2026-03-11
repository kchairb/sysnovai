import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";

type BrandMode = "general" | "support" | "sales" | "marketing" | "tunisian-assistant";

export type BrandProfileRecord = {
  brandId: string;
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
  var __sysnovaBrandProfiles: Record<string, Record<string, BrandProfileRecord>> | undefined;
}

function normalizeMode(mode?: string): BrandMode {
  const normalized = mode?.trim().toLowerCase();
  return ["general", "support", "sales", "marketing", "tunisian-assistant"].includes(
    normalized || ""
  )
    ? (normalized as BrandMode)
    : "support";
}

function createDefaultBrandRecord(workspaceExternalId: string): BrandProfileRecord {
  return {
    brandId: "brand-default",
    workspaceId: workspaceExternalId,
    brandName: "My Brand",
    websiteUrl: "",
    instagram: "",
    defaultMode: "support",
    context: "",
    updatedAt: new Date().toISOString()
  };
}

export async function listBrandProfiles(workspaceExternalId: string): Promise<BrandProfileRecord[]> {
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
    const existing = await prisma.brandProfile.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }]
    });
    if (!existing.length) {
      const created = await prisma.brandProfile.create({
        data: {
          workspaceId: workspace.id,
          externalId: "brand-default",
          brandName: "My Brand",
          defaultMode: "support",
          context: "",
          isDefault: true
        }
      });
      return [
        {
          brandId: created.externalId,
          workspaceId: workspaceExternalId,
          brandName: created.brandName,
          websiteUrl: created.websiteUrl ?? "",
          instagram: created.instagram ?? "",
          defaultMode: normalizeMode(created.defaultMode),
          context: created.context ?? "",
          updatedAt: created.updatedAt.toISOString()
        }
      ];
    }
    return existing.map((profile) => ({
      brandId: profile.externalId,
      workspaceId: workspaceExternalId,
      brandName: profile.brandName,
      websiteUrl: profile.websiteUrl ?? "",
      instagram: profile.instagram ?? "",
      defaultMode: normalizeMode(profile.defaultMode),
      context: profile.context ?? "",
      updatedAt: profile.updatedAt.toISOString()
    }));
  }

  const profiles = global.__sysnovaBrandProfiles ?? {};
  if (!profiles[workspaceExternalId]) {
    profiles[workspaceExternalId] = {
      "brand-default": createDefaultBrandRecord(workspaceExternalId)
    };
    global.__sysnovaBrandProfiles = profiles;
  }
  return Object.values(profiles[workspaceExternalId]);
}

export async function getBrandProfile(
  workspaceExternalId: string,
  brandId?: string
): Promise<BrandProfileRecord> {
  const brands = await listBrandProfiles(workspaceExternalId);
  if (brandId?.trim()) {
    const selected = brands.find((brand) => brand.brandId === brandId.trim());
    if (selected) return selected;
  }
  return brands[0] ?? createDefaultBrandRecord(workspaceExternalId);
}

export async function upsertBrandProfile(input: {
  workspaceExternalId: string;
  brandId?: string;
  brandName?: string;
  websiteUrl?: string;
  instagram?: string;
  defaultMode?: string;
  context?: string;
}) {
  const current = await getBrandProfile(input.workspaceExternalId, input.brandId);
  const nextBrandId = (input.brandId?.trim() || current.brandId || "brand-default").slice(0, 64);
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
    if (nextBrandId === "brand-default") {
      await prisma.brandProfile.updateMany({
        where: { workspaceId: workspace.id, externalId: "brand-default" },
        data: { isDefault: true }
      });
    }
    const profile = await prisma.brandProfile.upsert({
      where: {
        workspaceId_externalId: {
          workspaceId: workspace.id,
          externalId: nextBrandId
        }
      },
      update: next,
      create: {
        workspaceId: workspace.id,
        externalId: nextBrandId,
        isDefault: nextBrandId === "brand-default",
        ...next
      }
    });
    return {
      brandId: profile.externalId,
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
  const workspaceProfiles = profiles[input.workspaceExternalId] ?? {};
  const updated: BrandProfileRecord = {
    brandId: nextBrandId,
    workspaceId: input.workspaceExternalId,
    ...next,
    updatedAt: new Date().toISOString()
  };
  workspaceProfiles[nextBrandId] = updated;
  profiles[input.workspaceExternalId] = workspaceProfiles;
  global.__sysnovaBrandProfiles = profiles;
  return updated;
}

export async function createBrandProfile(input: {
  workspaceExternalId: string;
  brandName: string;
}) {
  const normalized = input.brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const base = normalized || "brand";
  const externalId = `brand-${base.slice(0, 40)}-${Math.random().toString(36).slice(2, 7)}`;
  return upsertBrandProfile({
    workspaceExternalId: input.workspaceExternalId,
    brandId: externalId,
    brandName: input.brandName
  });
}
