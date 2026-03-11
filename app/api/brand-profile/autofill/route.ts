import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/server/db";
import { autoFillBrandFromWebsite } from "@/lib/server/brand-ingest";
import { upsertIngestedWorkspaceProduct } from "@/lib/server/product-store";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type AutofillBody = {
  workspaceId?: string;
  brandId?: string;
  websiteUrl?: string;
  maxPages?: number;
  persistProducts?: boolean;
};

export async function POST(request: Request) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as AutofillBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    const brandId = body.brandId?.trim() || "brand-default";
    const websiteUrl = body.websiteUrl?.trim() || "";
    if (!websiteUrl) {
      return NextResponse.json({ error: "Website URL is required." }, { status: 400 });
    }

    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const data = await autoFillBrandFromWebsite({
      websiteUrl,
      maxPages: Number(body.maxPages ?? 10)
    });
    let productsCreated = 0;
    let productsUpdated = 0;
    if (body.persistProducts !== false && data.products.length) {
      for (const product of data.products) {
        const result = await upsertIngestedWorkspaceProduct({
          workspaceId,
          brandId,
          name: product.name,
          category: "catalog",
          description: `Auto-filled from website: ${websiteUrl}`,
          price: product.price,
          availability: product.availability,
          imageUrl: product.imageUrl,
          sourceUrl: product.sourceUrl,
          tags: ["autofill", "shop-crawl", brandId]
        });
        if (result.action === "created") {
          productsCreated += 1;
        } else {
          productsUpdated += 1;
        }
      }
    }
    return NextResponse.json({
      data,
      persistedProducts: {
        created: productsCreated,
        updated: productsUpdated
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to auto-fill brand data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
