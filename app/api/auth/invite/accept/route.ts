import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createPasswordHash, createUserSession, setSessionCookie } from "@/lib/server/auth";
import { writeAdminAuditLog } from "@/lib/server/admin-audit";
import { getPrisma } from "@/lib/server/db";

type Body = {
  token?: string;
  name?: string;
  password?: string;
};

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const token = body.token?.trim() ?? "";
  const name = body.name?.trim() || null;
  const password = body.password ?? "";

  if (!token) {
    return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const prisma = getPrisma();
  const invite = await prisma.inviteToken.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { workspace: true }
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invitation link." }, { status: 400 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json({ error: "Invitation is no longer valid." }, { status: 400 });
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    await prisma.inviteToken.update({
      where: { id: invite.id },
      data: { status: "expired" }
    });
    return NextResponse.json({ error: "Invitation has expired." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "This email already has an account. Sign in and ask admin for workspace access." },
      { status: 400 }
    );
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name,
          passwordHash: createPasswordHash(password),
          isActive: true
        }
      })
    : await prisma.user.create({
        data: {
          email: invite.email,
          name,
          passwordHash: createPasswordHash(password),
          isActive: true
        }
      });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: invite.workspaceId,
        userId: user.id
      }
    },
    update: {
      role: invite.role
    },
    create: {
      workspaceId: invite.workspaceId,
      userId: user.id,
      role: invite.role
    }
  });

  await prisma.inviteToken.update({
    where: { id: invite.id },
    data: {
      status: "accepted",
      acceptedAt: new Date(),
      acceptedUserId: user.id
    }
  });

  await writeAdminAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "accept_invitation",
    targetUserEmail: user.email,
    workspaceExternalId: invite.workspace.externalId,
    metadata: { role: invite.role }
  });

  const sessionToken = await createUserSession(user.id);
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    workspace: {
      externalId: invite.workspace.externalId,
      name: invite.workspace.name,
      role: invite.role
    }
  });
  await setSessionCookie(response, sessionToken);
  return response;
}
