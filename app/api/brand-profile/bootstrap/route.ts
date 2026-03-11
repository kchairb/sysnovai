import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { bootstrapBrandWorkspace } from "@/lib/server/brand-bootstrap";
import { hasDatabaseUrl } from "@/lib/server/db";
import { ensureWorkspaceForRequest } from "@/lib/server/workspace-identity";

type BootstrapBody = {
  workspaceId?: string;
  brandId?: string;
  brandName?: string;
  websiteUrl?: string;
  instagram?: string;
  defaultMode?: "general" | "support" | "sales" | "marketing" | "tunisian-assistant";
  context?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsapp?: string;
  address?: string;
  shippingInfo?: string;
  returnPolicy?: string;
  paymentMethods?: string;
  keyProducts?: string;
};

export async function POST(request: Request) {
  try {
    const user = authEnabled() ? await getAuthenticatedUserFromRequest(request) : null;
    if (authEnabled() && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as BootstrapBody;
    const workspaceId = body.workspaceId?.trim() || "workspace-default";
    if (hasDatabaseUrl() && user) {
      await ensureWorkspaceForRequest(user, workspaceId);
    }

    const brandName = body.brandName?.trim() || "My Brand";
    const result = await bootstrapBrandWorkspace({
      workspaceId,
      brandId: body.brandId?.trim() || "brand-default",
      brandName,
      websiteUrl: body.websiteUrl,
      instagram: body.instagram,
      defaultMode: body.defaultMode,
      context: body.context,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      whatsapp: body.whatsapp,
      address: body.address,
      shippingInfo: body.shippingInfo,
      returnPolicy: body.returnPolicy,
      paymentMethods: body.paymentMethods,
      keyProducts: body.keyProducts
    });

    return NextResponse.json({
      profile: result.profile,
      stats: result.stats
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to bootstrap brand.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
