import { type Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";
import { ensurePersistentStorageConfigured } from "@/lib/server/storage-mode";

export type ProductRecord = {
  id: string;
  workspaceId: string;
  name: string;
  category?: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  sourceUrl?: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __sysnovaProducts: ProductRecord[] | undefined;
}

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function mapRow(row: {
  id: string;
  workspace: { externalId: string };
  name: string;
  category: string | null;
  description: string | null;
  price: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  tags: Prisma.JsonValue | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ProductRecord {
  return {
    id: row.id,
    workspaceId: row.workspace.externalId,
    name: row.name,
    category: row.category ?? undefined,
    description: row.description ?? undefined,
    price: row.price ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

async function ensureWorkspaceByExternalId(workspaceExternalId: string) {
  const prisma = getPrisma();
  return prisma.workspace.upsert({
    where: { externalId: workspaceExternalId },
    update: {},
    create: {
      externalId: workspaceExternalId,
      name: "Sysnova Workspace",
      slug: `sysnova-workspace-${workspaceExternalId.replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "main"}`
    }
  });
}

export async function listWorkspaceProducts(input: {
  workspaceId: string;
  includeInactive?: boolean;
  search?: string;
  sourceDomain?: string;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 200, 1), 500);
  const search = input.search?.trim();
  const sourceDomain = input.sourceDomain?.trim().toLowerCase();

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const rows = await prisma.product.findMany({
      where: {
        workspace: { externalId: input.workspaceId },
        ...(input.includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
              ]
            }
          : {}),
        ...(sourceDomain
          ? {
              sourceUrl: {
                contains: sourceDomain,
                mode: "insensitive"
              }
            }
          : {})
      },
      include: { workspace: { select: { externalId: true } } },
      orderBy: { updatedAt: "desc" },
      take: limit
    });
    return rows.map(mapRow);
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaProducts ?? [];
  const q = search?.toLowerCase() ?? "";
  return store
    .filter((item) => item.workspaceId === input.workspaceId)
    .filter((item) => (input.includeInactive ? true : item.isActive))
    .filter((item) =>
      q ? `${item.name}\n${item.description ?? ""}\n${item.tags.join(" ")}`.toLowerCase().includes(q) : true
    )
    .filter((item) => (sourceDomain ? (item.sourceUrl ?? "").toLowerCase().includes(sourceDomain) : true))
    .slice(0, limit);
}

export async function createWorkspaceProduct(input: {
  workspaceId: string;
  name: string;
  category?: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  sourceUrl?: string;
  tags?: unknown;
}) {
  const name = input.name.trim().slice(0, 180);
  if (!name) {
    throw new Error("Product name is required.");
  }
  const category = input.category?.trim().slice(0, 80) || undefined;
  const description = input.description?.trim().slice(0, 3000) || undefined;
  const price = input.price?.trim().slice(0, 80) || undefined;
  const imageUrl = input.imageUrl?.trim().slice(0, 600) || undefined;
  const sourceUrl = input.sourceUrl?.trim().slice(0, 600) || undefined;
  const tags = normalizeTags(input.tags);

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await ensureWorkspaceByExternalId(input.workspaceId);
    const row = await prisma.product.create({
      data: {
        workspaceId: workspace.id,
        name,
        category,
        description,
        price,
        imageUrl,
        sourceUrl,
        tags: tags as Prisma.InputJsonValue,
        isActive: true
      },
      include: { workspace: { select: { externalId: true } } }
    });
    return mapRow(row);
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaProducts ?? [];
  const now = new Date().toISOString();
  const product: ProductRecord = {
    id: `local-product-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    name,
    category,
    description,
    price,
    imageUrl,
    sourceUrl,
    tags,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
  store.unshift(product);
  global.__sysnovaProducts = store.slice(0, 5000);
  return product;
}

export async function upsertIngestedWorkspaceProduct(input: {
  workspaceId: string;
  name: string;
  category?: string;
  description?: string;
  price?: string;
  imageUrl?: string;
  sourceUrl?: string;
  tags?: unknown;
}) {
  const name = input.name.trim().slice(0, 180);
  if (!name) {
    throw new Error("Product name is required.");
  }
  const sourceUrl = input.sourceUrl?.trim().slice(0, 600) || undefined;
  const fingerprint = createHash("sha1").update(name.toLowerCase()).digest("hex");

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await ensureWorkspaceByExternalId(input.workspaceId);
    const existing = sourceUrl
      ? await prisma.product.findFirst({
          where: { workspaceId: workspace.id, sourceUrl },
          include: { workspace: { select: { externalId: true } } }
        })
      : await prisma.product.findFirst({
          where: {
            workspaceId: workspace.id,
            OR: [{ name: { equals: name, mode: "insensitive" } }]
          },
          include: { workspace: { select: { externalId: true } } }
        });
    if (!existing) {
      const created = await createWorkspaceProduct(input);
      return { product: created, action: "created" as const };
    }
    const nextTags = normalizeTags(input.tags);
    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name,
        category: input.category?.trim().slice(0, 80) || undefined,
        description: input.description?.trim().slice(0, 3000) || undefined,
        price: input.price?.trim().slice(0, 80) || undefined,
        imageUrl: input.imageUrl?.trim().slice(0, 600) || undefined,
        sourceUrl,
        tags: nextTags as Prisma.InputJsonValue,
        isActive: true
      },
      include: { workspace: { select: { externalId: true } } }
    });
    const currentFingerprint = createHash("sha1").update(existing.name.toLowerCase()).digest("hex");
    return { product: mapRow(updated), action: currentFingerprint === fingerprint ? "updated" : "updated" as const };
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaProducts ?? [];
  const existing = store.find(
    (item) =>
      item.workspaceId === input.workspaceId &&
      (sourceUrl ? item.sourceUrl === sourceUrl : item.name.toLowerCase() === name.toLowerCase())
  );
  if (!existing) {
    const created = await createWorkspaceProduct(input);
    return { product: created, action: "created" as const };
  }
  existing.name = name;
  existing.category = input.category?.trim().slice(0, 80) || undefined;
  existing.description = input.description?.trim().slice(0, 3000) || undefined;
  existing.price = input.price?.trim().slice(0, 80) || undefined;
  existing.imageUrl = input.imageUrl?.trim().slice(0, 600) || undefined;
  existing.sourceUrl = sourceUrl;
  existing.tags = normalizeTags(input.tags);
  existing.isActive = true;
  existing.updatedAt = new Date().toISOString();
  return { product: existing, action: "updated" as const };
}

export async function updateWorkspaceProduct(input: {
  id: string;
  workspaceId: string;
  name?: string;
  category?: string | null;
  description?: string | null;
  price?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  tags?: unknown;
  isActive?: boolean;
}) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const existing = await prisma.product.findFirst({
      where: { id: input.id, workspace: { externalId: input.workspaceId } },
      include: { workspace: { select: { externalId: true } } }
    });
    if (!existing) {
      throw new Error("Product not found.");
    }
    const row = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: typeof input.name === "string" ? input.name.trim().slice(0, 180) : undefined,
        category:
          input.category === null
            ? null
            : typeof input.category === "string"
              ? input.category.trim().slice(0, 80) || null
              : undefined,
        description:
          input.description === null
            ? null
            : typeof input.description === "string"
              ? input.description.trim().slice(0, 3000) || null
              : undefined,
        price:
          input.price === null
            ? null
            : typeof input.price === "string"
              ? input.price.trim().slice(0, 80) || null
              : undefined,
        imageUrl:
          input.imageUrl === null
            ? null
            : typeof input.imageUrl === "string"
              ? input.imageUrl.trim().slice(0, 600) || null
              : undefined,
        sourceUrl:
          input.sourceUrl === null
            ? null
            : typeof input.sourceUrl === "string"
              ? input.sourceUrl.trim().slice(0, 600) || null
              : undefined,
        tags: input.tags !== undefined ? (normalizeTags(input.tags) as Prisma.InputJsonValue) : undefined,
        isActive: typeof input.isActive === "boolean" ? input.isActive : undefined
      },
      include: { workspace: { select: { externalId: true } } }
    });
    return mapRow(row);
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaProducts ?? [];
  const item = store.find((row) => row.id === input.id && row.workspaceId === input.workspaceId);
  if (!item) {
    throw new Error("Product not found.");
  }
  if (typeof input.name === "string") item.name = input.name.trim().slice(0, 180);
  if (input.category === null) item.category = undefined;
  else if (typeof input.category === "string") item.category = input.category.trim().slice(0, 80) || undefined;
  if (input.description === null) item.description = undefined;
  else if (typeof input.description === "string")
    item.description = input.description.trim().slice(0, 3000) || undefined;
  if (input.price === null) item.price = undefined;
  else if (typeof input.price === "string") item.price = input.price.trim().slice(0, 80) || undefined;
  if (input.imageUrl === null) item.imageUrl = undefined;
  else if (typeof input.imageUrl === "string") item.imageUrl = input.imageUrl.trim().slice(0, 600) || undefined;
  if (input.sourceUrl === null) item.sourceUrl = undefined;
  else if (typeof input.sourceUrl === "string")
    item.sourceUrl = input.sourceUrl.trim().slice(0, 600) || undefined;
  if (input.tags !== undefined) item.tags = normalizeTags(input.tags);
  if (typeof input.isActive === "boolean") item.isActive = input.isActive;
  item.updatedAt = new Date().toISOString();
  return item;
}

export async function deleteWorkspaceProduct(input: { id: string; workspaceId: string }) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const existing = await prisma.product.findFirst({
      where: { id: input.id, workspace: { externalId: input.workspaceId } },
      select: { id: true }
    });
    if (!existing) {
      throw new Error("Product not found.");
    }
    await prisma.product.delete({ where: { id: existing.id } });
    return;
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaProducts ?? [];
  global.__sysnovaProducts = store.filter((row) => !(row.id === input.id && row.workspaceId === input.workspaceId));
}
