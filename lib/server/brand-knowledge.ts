import { type Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";
import { ensurePersistentStorageConfigured } from "@/lib/server/storage-mode";

export type BrandKnowledgeCategory = "faq" | "policy" | "product" | "document" | "brand";

export type BrandKnowledgeEntryRecord = {
  id: string;
  workspaceId: string;
  category: BrandKnowledgeCategory;
  title: string;
  content: string;
  sourceUrl?: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __sysnovaBrandKnowledge: BrandKnowledgeEntryRecord[] | undefined;
}

function ensureCategory(value: string): BrandKnowledgeCategory {
  const normalized = value.trim().toLowerCase();
  if (["faq", "policy", "product", "document", "brand"].includes(normalized)) {
    return normalized as BrandKnowledgeCategory;
  }
  throw new Error("Invalid category.");
}

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function mapRow(
  row: {
    id: string;
    workspaceId: string;
    category: string;
    title: string;
    content: string;
    sourceUrl: string | null;
    tags: Prisma.JsonValue | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
): BrandKnowledgeEntryRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    category: row.category as BrandKnowledgeCategory,
    title: row.title,
    content: row.content,
    sourceUrl: row.sourceUrl ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function listBrandKnowledgeEntries(input: {
  workspaceId: string;
  includeInactive?: boolean;
  category?: string;
  search?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 200, 1), 500);
  const category = input.category?.trim() ? ensureCategory(input.category) : undefined;
  const search = input.search?.trim().toLowerCase();

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const rows = await prisma.brandKnowledgeEntry.findMany({
      where: {
        workspace: { externalId: input.workspaceId },
        ...(input.includeInactive ? {} : { isActive: true }),
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { updatedAt: "desc" },
      take: limit
    });
    return rows.map(mapRow);
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaBrandKnowledge ?? [];
  return store
    .filter((entry) => entry.workspaceId === input.workspaceId)
    .filter((entry) => (input.includeInactive ? true : entry.isActive))
    .filter((entry) => (category ? entry.category === category : true))
    .filter((entry) =>
      search ? `${entry.title}\n${entry.content}`.toLowerCase().includes(search) : true
    )
    .slice(0, limit);
}

export async function createBrandKnowledgeEntry(input: {
  workspaceId: string;
  category: string;
  title: string;
  content: string;
  tags?: unknown;
  sourceUrl?: string;
  contentHash?: string;
}) {
  const category = ensureCategory(input.category);
  const title = input.title.trim().slice(0, 160);
  const content = input.content.trim().slice(0, 6000);
  if (!title || !content) {
    throw new Error("Title and content are required.");
  }
  const tags = normalizeTags(input.tags);

  const sourceUrl = input.sourceUrl?.trim() || undefined;
  const contentHash =
    input.contentHash?.trim() ||
    createHash("sha256").update(`${title}\n${content}`).digest("hex");

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await prisma.workspace.upsert({
      where: { externalId: input.workspaceId },
      update: {},
      create: {
        externalId: input.workspaceId,
        name: "Sysnova Workspace",
        slug: `workspace-${input.workspaceId.replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "main"}`
      }
    });
    const row = await prisma.brandKnowledgeEntry.create({
      data: {
        workspaceId: workspace.id,
        category,
        title,
        content,
        sourceUrl,
        contentHash,
        tags: tags as Prisma.InputJsonValue,
        isActive: true
      }
    });
    return mapRow(row);
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaBrandKnowledge ?? [];
  const now = new Date().toISOString();
  const entry: BrandKnowledgeEntryRecord = {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    category,
    title,
    content,
    sourceUrl,
    tags,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
  store.unshift(entry);
  global.__sysnovaBrandKnowledge = store.slice(0, 5000);
  return entry;
}

export async function upsertIngestedBrandKnowledgeEntry(input: {
  workspaceId: string;
  category: string;
  title: string;
  content: string;
  sourceUrl: string;
  tags?: unknown;
}) {
  const category = ensureCategory(input.category);
  const title = input.title.trim().slice(0, 160);
  const content = input.content.trim().slice(0, 6000);
  const sourceUrl = input.sourceUrl.trim();
  const tags = normalizeTags(input.tags);
  const contentHash = createHash("sha256").update(`${title}\n${content}`).digest("hex");

  if (!title || !content || !sourceUrl) {
    throw new Error("Title, content, and sourceUrl are required.");
  }

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await prisma.workspace.upsert({
      where: { externalId: input.workspaceId },
      update: {},
      create: {
        externalId: input.workspaceId,
        name: "Sysnova Workspace",
        slug: `workspace-${input.workspaceId.replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "main"}`
      }
    });
    const existing = await prisma.brandKnowledgeEntry.findFirst({
      where: { workspaceId: workspace.id, sourceUrl }
    });
    if (!existing) {
      const created = await prisma.brandKnowledgeEntry.create({
        data: {
          workspaceId: workspace.id,
          category,
          title,
          content,
          sourceUrl,
          contentHash,
          tags: tags as Prisma.InputJsonValue,
          isActive: true
        }
      });
      return { entry: mapRow(created), action: "created" as const };
    }
    if (existing.contentHash === contentHash) {
      return { entry: mapRow(existing), action: "unchanged" as const };
    }
    const updated = await prisma.brandKnowledgeEntry.update({
      where: { id: existing.id },
      data: {
        category,
        title,
        content,
        contentHash,
        tags: tags as Prisma.InputJsonValue,
        isActive: true
      }
    });
    return { entry: mapRow(updated), action: "updated" as const };
  }

  const entry = await createBrandKnowledgeEntry({
    workspaceId: input.workspaceId,
    category,
    title,
    content,
    sourceUrl,
    contentHash,
    tags
  });
  return { entry, action: "created" as const };
}

export async function updateBrandKnowledgeEntry(input: {
  id: string;
  workspaceId: string;
  category?: string;
  title?: string;
  content?: string;
  tags?: unknown;
  isActive?: boolean;
}) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const existing = await prisma.brandKnowledgeEntry.findFirst({
      where: { id: input.id, workspace: { externalId: input.workspaceId } }
    });
    if (!existing) {
      throw new Error("Entry not found.");
    }
    const row = await prisma.brandKnowledgeEntry.update({
      where: { id: existing.id },
      data: {
        category: input.category ? ensureCategory(input.category) : undefined,
        title: input.title?.trim().slice(0, 160),
        content: input.content?.trim().slice(0, 6000),
        tags: input.tags !== undefined ? (normalizeTags(input.tags) as Prisma.InputJsonValue) : undefined,
        isActive: typeof input.isActive === "boolean" ? input.isActive : undefined
      }
    });
    return mapRow(row);
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaBrandKnowledge ?? [];
  const target = store.find((entry) => entry.id === input.id && entry.workspaceId === input.workspaceId);
  if (!target) {
    throw new Error("Entry not found.");
  }
  if (input.category) target.category = ensureCategory(input.category);
  if (typeof input.title === "string") target.title = input.title.trim().slice(0, 160);
  if (typeof input.content === "string") target.content = input.content.trim().slice(0, 6000);
  if (input.tags !== undefined) target.tags = normalizeTags(input.tags);
  if (typeof input.isActive === "boolean") target.isActive = input.isActive;
  target.updatedAt = new Date().toISOString();
  return target;
}

export async function deleteBrandKnowledgeEntry(input: { id: string; workspaceId: string }) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const existing = await prisma.brandKnowledgeEntry.findFirst({
      where: { id: input.id, workspace: { externalId: input.workspaceId } }
    });
    if (!existing) {
      throw new Error("Entry not found.");
    }
    await prisma.brandKnowledgeEntry.delete({ where: { id: existing.id } });
    return;
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaBrandKnowledge ?? [];
  global.__sysnovaBrandKnowledge = store.filter(
    (entry) => !(entry.id === input.id && entry.workspaceId === input.workspaceId)
  );
}
