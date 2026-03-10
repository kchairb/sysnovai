import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { writeAdminAuditLog } from "@/lib/server/admin-audit";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { getPrisma } from "@/lib/server/db";
import { sendInviteEmail } from "@/lib/server/invite-email";

type CreateInviteBody = {
  email?: string;
  workspaceExternalId?: string;
  workspaceName?: string;
  role?: string;
  expiresInDays?: number;
  language?: "en" | "fr" | "ar";
  sendEmail?: boolean;
};

type UpdateInviteBody = {
  invitationId?: string;
  action?: "revoke" | "retryEmail";
  language?: "en" | "fr" | "ar";
};

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getOwnerEmail() {
  return (process.env.SYSNOVA_DEFAULT_USER_EMAIL ?? "owner@sysnova.ai").trim().toLowerCase();
}

async function requireAdmin(request: Request) {
  if (!authEnabled()) {
    return { ok: true as const, user: null };
  }
  const user = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.email.trim().toLowerCase() !== getOwnerEmail()) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, user };
}

export async function GET(request: Request) {
  const rateLimited = applyRateLimit(request, {
    bucket: "admin:invitations:get",
    limit: 80,
    windowMs: 60_000
  });
  if (rateLimited) return rateLimited;

  const access = await requireAdmin(request);
  if (!access.ok) return access.response;

  const prisma = getPrisma();
  const now = new Date();
  const invitations = await prisma.inviteToken.findMany({
    where: {
      status: "pending",
      expiresAt: { gt: now }
    },
    include: { workspace: true },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json({
    invitations: invitations.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      workspaceExternalId: invite.workspace.externalId,
      workspaceName: invite.workspace.name,
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString()
    }))
  });
}

export async function POST(request: Request) {
  const rateLimited = applyRateLimit(request, {
    bucket: "admin:invitations:post",
    limit: 25,
    windowMs: 60_000
  });
  if (rateLimited) return rateLimited;

  const access = await requireAdmin(request);
  if (!access.ok) return access.response;

  const body = (await request.json()) as CreateInviteBody;
  const email = body.email?.trim().toLowerCase() ?? "";
  const workspaceExternalId = body.workspaceExternalId?.trim() ?? "workspace-default";
  const workspaceName = body.workspaceName?.trim() || "Sysnova Workspace";
  const role = body.role?.trim().toLowerCase() ?? "viewer";
  const expiresInDays = Math.min(Math.max(body.expiresInDays ?? 7, 1), 30);
  const language = body.language ?? "en";
  const sendEmail = body.sendEmail ?? true;

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!["owner", "admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
  }

  const prisma = getPrisma();
  const workspace = await prisma.workspace.upsert({
    where: { externalId: workspaceExternalId },
    update: { name: workspaceName },
    create: {
      externalId: workspaceExternalId,
      name: workspaceName,
      slug: `workspace-${workspaceExternalId.replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "main"}`
    }
  });

  await prisma.inviteToken.updateMany({
    where: {
      email,
      workspaceId: workspace.id,
      status: "pending"
    },
    data: {
      status: "revoked",
      revokedAt: new Date()
    }
  });

  const rawToken = randomBytes(32).toString("base64url");
  const invite = await prisma.inviteToken.create({
    data: {
      tokenHash: hashInviteToken(rawToken),
      email,
      workspaceId: workspace.id,
      role,
      status: "pending",
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      invitedByUserId: access.user?.id ?? null
    }
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const inviteLink = `${baseUrl}/auth/invite?token=${encodeURIComponent(rawToken)}`;
  const emailResult = sendEmail
    ? await sendInviteEmail({
        to: email,
        inviteLink,
        workspaceName: workspace.name,
        role,
        expiresInDays,
        language
      })
    : { delivered: false, provider: "none" as const, reason: "Email sending disabled by admin." };

  await writeAdminAuditLog({
    actorUserId: access.user?.id,
    actorEmail: access.user?.email ?? getOwnerEmail(),
    action: "create_invitation",
    targetUserEmail: email,
    workspaceExternalId,
    metadata: {
      role,
      expiresInDays,
      language,
      sendEmail,
      emailDelivery: emailResult.delivered ? "sent" : "not-sent",
      emailProvider: emailResult.provider
    }
  });

  return NextResponse.json({
    ok: true,
    invitation: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      workspaceExternalId,
      workspaceName: workspace.name,
      expiresAt: invite.expiresAt.toISOString(),
      inviteLink,
      language,
      delivery: {
        requested: sendEmail,
        delivered: emailResult.delivered,
        provider: emailResult.provider,
        reason: emailResult.reason ?? null
      }
    }
  });
}

export async function PATCH(request: Request) {
  const rateLimited = applyRateLimit(request, {
    bucket: "admin:invitations:patch",
    limit: 35,
    windowMs: 60_000
  });
  if (rateLimited) return rateLimited;

  const access = await requireAdmin(request);
  if (!access.ok) return access.response;

  const body = (await request.json()) as UpdateInviteBody;
  if (!body.action || !body.invitationId?.trim()) {
    return NextResponse.json({ error: "invitationId and action are required." }, { status: 400 });
  }

  const prisma = getPrisma();
  const invite = await prisma.inviteToken.findUnique({
    where: { id: body.invitationId.trim() },
    include: { workspace: true }
  });
  if (!invite) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }

  if (body.action === "revoke") {
    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: {
        status: "revoked",
        revokedAt: new Date()
      }
    });

    await writeAdminAuditLog({
      actorUserId: access.user?.id,
      actorEmail: access.user?.email ?? getOwnerEmail(),
      action: "revoke_invitation",
      targetUserEmail: invite.email,
      workspaceExternalId: invite.workspace.externalId
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "retryEmail") {
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Only pending invitations can be resent." }, { status: 400 });
    }
    if (invite.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Invitation is expired. Create a new one." }, { status: 400 });
    }
    const language = body.language ?? "en";
    const rawToken = randomBytes(32).toString("base64url");
    const updated = await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { tokenHash: hashInviteToken(rawToken) }
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const inviteLink = `${baseUrl}/auth/invite?token=${encodeURIComponent(rawToken)}`;
    const expiresInDays = Math.max(
      1,
      Math.ceil((updated.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    );
    const emailResult = await sendInviteEmail({
      to: invite.email,
      inviteLink,
      workspaceName: invite.workspace.name,
      role: invite.role,
      expiresInDays,
      language
    });

    await writeAdminAuditLog({
      actorUserId: access.user?.id,
      actorEmail: access.user?.email ?? getOwnerEmail(),
      action: "retry_invitation_email",
      targetUserEmail: invite.email,
      workspaceExternalId: invite.workspace.externalId,
      metadata: {
        invitationId: invite.id,
        language,
        delivery: emailResult.delivered ? "sent" : "not-sent",
        provider: emailResult.provider
      }
    });

    return NextResponse.json({
      ok: emailResult.delivered,
      inviteLink,
      delivery: emailResult
    });
  }

  return NextResponse.json({ error: "Unsupported invitation action." }, { status: 400 });
}
