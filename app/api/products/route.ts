import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/server/db";
import {
  createWorkspaceProduct,
  listWorkspaceProducts
} from "@/lib/server/product-store";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type CreateBody = {
  workspaceId?: string;
  brandId?: string;
  name?: string;
  category?: string;
  description?: string;
  price?: string;
  availability?: string;
  imageUrl?: string;
  sourceUrl?: string;
  tags?: unknown;
};

export async function GET(request: Request) {
  try {
    if (authEnabled()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId")?.trim() || "workspace-default";
    const brandId = searchParams.get("brandId")?.trim() || undefined;
    const search = searchParams.get("search")?.trim() || undefined;
    const sourceDomain = searchParams.get("sourceDomain")?.trim() || undefined;
    const includeInactive = searchParams.get("includeInactive") === "1";
    const limit = Number(searchParams.get("limit") ?? 200);

    if (hasDatabaseUrl()) {
      const user = await getAuthenticatedUserFromRequest(request);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const data = await listWorkspaceProducts({
      workspaceId,
      brandId,
      search,
      sourceDomain,
      includeInactive,
      limit
    });
    return NextResponse.json({
      data,
      total: data.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load products.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CreateBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const product = await createWorkspaceProduct({
      workspaceId,
      brandId: body.brandId?.trim() || undefined,
      name: body.name ?? "",
      category: body.category,
      description: body.description,
      price: body.price,
      availability: body.availability,
      imageUrl: body.imageUrl,
      sourceUrl: body.sourceUrl,
      tags: body.tags
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create product.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
