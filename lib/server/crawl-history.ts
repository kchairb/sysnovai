import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";
import { ensurePersistentStorageConfigured } from "@/lib/server/storage-mode";

export type CrawlRunRecord = {
  id: string;
  workspaceId: string;
  brandId?: string;
  strategyUsed: string;
  requestedStrategy?: string;
  pagesCrawled: number;
  entriesCreated: number;
  entriesUpdated: number;
  entriesSkipped: number;
  productsCreated: number;
  productsUpdated: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __sysnovaCrawlRuns: CrawlRunRecord[] | undefined;
}

export async function recordCrawlRun(input: {
  workspaceId: string;
  brandId?: string;
  strategyUsed: string;
  requestedStrategy?: string;
  pagesCrawled: number;
  entriesCreated: number;
  entriesUpdated: number;
  entriesSkipped: number;
  productsCreated: number;
  productsUpdated: number;
  successCount: number;
  failedCount: number;
}) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await prisma.workspace.upsert({
      where: { externalId: input.workspaceId },
      update: {},
      create: {
        externalId: input.workspaceId,
        name: "Sysnova Workspace",
        slug: `sysnova-workspace-${input.workspaceId.replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "main"}`
      }
    });
    const row = await prisma.crawlIngestRun.create({
      data: {
        workspaceId: workspace.id,
        brandId: input.brandId?.trim() || null,
        strategyUsed: input.strategyUsed,
        requestedStrategy: input.requestedStrategy,
        pagesCrawled: input.pagesCrawled,
        entriesCreated: input.entriesCreated,
        entriesUpdated: input.entriesUpdated,
        entriesSkipped: input.entriesSkipped,
        productsCreated: input.productsCreated,
        productsUpdated: input.productsUpdated,
        successCount: input.successCount,
        failedCount: input.failedCount
      }
    });
    return {
      id: row.id,
      workspaceId: input.workspaceId,
      brandId: input.brandId?.trim() || undefined,
      strategyUsed: row.strategyUsed,
      requestedStrategy: row.requestedStrategy ?? undefined,
      pagesCrawled: row.pagesCrawled,
      entriesCreated: row.entriesCreated,
      entriesUpdated: row.entriesUpdated,
      entriesSkipped: row.entriesSkipped,
      productsCreated: row.productsCreated,
      productsUpdated: row.productsUpdated,
      successCount: row.successCount,
      failedCount: row.failedCount,
      createdAt: row.createdAt.toISOString()
    } satisfies CrawlRunRecord;
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaCrawlRuns ?? [];
  const row: CrawlRunRecord = {
    id: `crawl-run-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    brandId: input.brandId?.trim() || undefined,
    strategyUsed: input.strategyUsed,
    requestedStrategy: input.requestedStrategy,
    pagesCrawled: input.pagesCrawled,
    entriesCreated: input.entriesCreated,
    entriesUpdated: input.entriesUpdated,
    entriesSkipped: input.entriesSkipped,
    productsCreated: input.productsCreated,
    productsUpdated: input.productsUpdated,
    successCount: input.successCount,
    failedCount: input.failedCount,
    createdAt: new Date().toISOString()
  };
  store.unshift(row);
  global.__sysnovaCrawlRuns = store.slice(0, 1000);
  return row;
}

export async function listCrawlRuns(input: { workspaceId: string; brandId?: string; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const rows = await prisma.crawlIngestRun.findMany({
      where: {
        workspace: { externalId: input.workspaceId },
        ...(input.brandId ? { brandId: input.brandId } : {})
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return rows.map(
      (row) =>
        ({
          id: row.id,
          workspaceId: input.workspaceId,
          brandId: row.brandId ?? undefined,
          strategyUsed: row.strategyUsed,
          requestedStrategy: row.requestedStrategy ?? undefined,
          pagesCrawled: row.pagesCrawled,
          entriesCreated: row.entriesCreated,
          entriesUpdated: row.entriesUpdated,
          entriesSkipped: row.entriesSkipped,
          productsCreated: row.productsCreated,
          productsUpdated: row.productsUpdated,
          successCount: row.successCount,
          failedCount: row.failedCount,
          createdAt: row.createdAt.toISOString()
        }) satisfies CrawlRunRecord
    );
  }

  ensurePersistentStorageConfigured();
  const store = global.__sysnovaCrawlRuns ?? [];
  return store
    .filter((item) => item.workspaceId === input.workspaceId)
    .filter((item) => (input.brandId ? item.brandId === input.brandId : true))
    .slice(0, limit);
}
