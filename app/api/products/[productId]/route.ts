import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/server/db";
import {
  deleteWorkspaceProduct,
  updateWorkspaceProduct
} from "@/lib/server/product-store";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type UpdateBody = {
  workspaceId?: string;
  name?: string;
  category?: string | null;
  description?: string | null;
  price?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  tags?: unknown;
  isActive?: boolean;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as UpdateBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const product = await updateWorkspaceProduct({
      id: productId,
      workspaceId,
      name: body.name,
      category: body.category,
      description: body.description,
      price: body.price,
      imageUrl: body.imageUrl,
      sourceUrl: body.sourceUrl,
      tags: body.tags,
      isActive: body.isActive
    });
    return NextResponse.json({ product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update product.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await context.params;
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId")?.trim() || "workspace-default";
    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    await deleteWorkspaceProduct({ id: productId, workspaceId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete product.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
