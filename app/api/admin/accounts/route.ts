import { NextResponse } from "next/server";
import { createPasswordHash, authEnabled, getAuthenticatedUserFromRequest } from "@/lib/server/auth";
import { writeAdminAuditLog } from "@/lib/server/admin-audit";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { getPrisma } from "@/lib/server/db";

type CreateBody = {
  name?: string;
  email?: string;
  password?: string;
  workspaceExternalId?: string;
  workspaceName?: string;
  role?: string;
};

type PatchBody = {
  workspaceExternalId?: string;
  userEmail?: string;
  role?: string;
  action?: "setRole" | "forceResetPassword" | "deactivate" | "reactivate" | "killSessions";
  newPassword?: string;
};

function getOwnerEmail() {
  return (process.env.SYSNOVA_DEFAULT_USER_EMAIL ?? "owner@sysnova.ai").trim().toLowerCase();
}

function toCsvCell(value: string | null | undefined) {
  if (!value) return "";
  const escaped = value.replace(/"/g, "\"\"");
  return `"${escaped}"`;
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
    bucket: "admin:accounts:get",
    limit: 80,
    windowMs: 60_000
  });
  if (rateLimited) return rateLimited;

  const access = await requireAdmin(request);
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const action = url.searchParams.get("action")?.trim() ?? "";
  const actor = url.searchParams.get("actor")?.trim() ?? "";
  const workspace = url.searchParams.get("workspace")?.trim() ?? "";
  const target = url.searchParams.get("target")?.trim() ?? "";
  const dateFrom = url.searchParams.get("from")?.trim() ?? "";
  const dateTo = url.searchParams.get("to")?.trim() ?? "";
  const format = (url.searchParams.get("format")?.trim().toLowerCase() ?? "json") as
    | "json"
    | "csv";
  const logLimit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 200);
  const parsedFrom = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
  const parsedTo = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;
  const hasFrom = parsedFrom && !Number.isNaN(parsedFrom.getTime());
  const hasTo = parsedTo && !Number.isNaN(parsedTo.getTime());

  const contains = (value: string) => ({
    contains: value,
    mode: "insensitive" as const
  });

  const logWhere = {
    ...(action ? { action: contains(action) } : {}),
    ...(actor ? { actorEmail: contains(actor) } : {}),
    ...(workspace ? { workspaceExternalId: contains(workspace) } : {}),
    ...(target ? { targetUserEmail: contains(target) } : {}),
    ...(search
      ? {
          OR: [
            { action: contains(search) },
            { actorEmail: contains(search) },
            { targetUserEmail: contains(search) },
            { workspaceExternalId: contains(search) }
          ]
        }
      : {}),
    ...((hasFrom || hasTo) && {
      createdAt: {
        ...(hasFrom ? { gte: parsedFrom as Date } : {}),
        ...(hasTo ? { lte: parsedTo as Date } : {})
      }
    })
  };

  const prisma = getPrisma();
  const [users, workspaces, sessions, logs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          include: {
            workspace: true
          }
        }
      }
    }),
    prisma.workspace.count(),
    prisma.userSession.count({
      where: {
        expiresAt: {
          gt: new Date()
        }
      }
    }),
    prisma.adminAuditLog.findMany({
      where: logWhere,
      orderBy: { createdAt: "desc" },
      take: logLimit
    })
  ]);

  if (format === "csv") {
    const header = [
      "createdAt",
      "action",
      "actorEmail",
      "targetUserEmail",
      "workspaceExternalId"
    ].join(",");
    const rows = logs.map((log) =>
      [
        toCsvCell(log.createdAt.toISOString()),
        toCsvCell(log.action),
        toCsvCell(log.actorEmail),
        toCsvCell(log.targetUserEmail),
        toCsvCell(log.workspaceExternalId)
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sysnova-admin-audit-${Date.now()}.csv"`
      }
    });
  }

  return NextResponse.json({
    summary: {
      users: users.length,
      workspaces,
      activeSessions: sessions
    },
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      memberships: user.memberships.map((membership) => ({
        workspaceId: membership.workspace.externalId,
        workspaceName: membership.workspace.name,
        role: membership.role
      }))
    })),
    auditLogs: logs.map((log) => ({
      id: log.id,
      actorEmail: log.actorEmail,
      action: log.action,
      targetUserEmail: log.targetUserEmail,
      workspaceExternalId: log.workspaceExternalId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString()
    }))
  });
}

export async function POST(request: Request) {
  const rateLimited = applyRateLimit(request, {
    bucket: "admin:accounts:post",
    limit: 25,
    windowMs: 60_000
  });
  if (rateLimited) return rateLimited;

  const access = await requireAdmin(request);
  if (!access.ok) return access.response;

  const body = (await request.json()) as CreateBody;
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || null;
  const password = body.password?.trim() ?? "";
  const workspaceExternalId = body.workspaceExternalId?.trim() ?? "workspace-default";
  const workspaceName = body.workspaceName?.trim() || "Sysnova Workspace";
  const role = body.role?.trim().toLowerCase() ?? "viewer";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (!["owner", "admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
  }

  const prisma = getPrisma();
  const [workspace, existingUser] = await Promise.all([
    prisma.workspace.upsert({
      where: { externalId: workspaceExternalId },
      update: {
        name: workspaceName
      },
      create: {
        externalId: workspaceExternalId,
        name: workspaceName,
        slug: `workspace-${workspaceExternalId.replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "main"}`
      }
    }),
    prisma.user.findUnique({ where: { email } })
  ]);

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name ?? existingUser.name,
          passwordHash: createPasswordHash(password),
          isActive: true
        }
      })
    : await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: createPasswordHash(password),
          isActive: true
        }
      });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id
      }
    },
    update: { role },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role
    }
  });

  await writeAdminAuditLog({
    actorUserId: access.user?.id,
    actorEmail: access.user?.email ?? getOwnerEmail(),
    action: "create_user",
    targetUserEmail: user.email,
    workspaceExternalId,
    metadata: { role }
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const rateLimited = applyRateLimit(request, {
    bucket: "admin:accounts:patch",
    limit: 30,
    windowMs: 60_000
  });
  if (rateLimited) return rateLimited;

  const access = await requireAdmin(request);
  if (!access.ok) return access.response;

  const body = (await request.json()) as PatchBody;
  const action = body.action ?? "setRole";
  const workspaceExternalId = body.workspaceExternalId?.trim();
  const userEmail = body.userEmail?.trim().toLowerCase();

  if (!userEmail) {
    return NextResponse.json({ error: "userEmail is required." }, { status: 400 });
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (action === "setRole") {
    const role = body.role?.trim().toLowerCase();
    if (!workspaceExternalId || !role) {
      return NextResponse.json(
        { error: "workspaceExternalId and role are required for setRole." },
        { status: 400 }
      );
    }
    if (!["owner", "admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
    }
    const workspace = await prisma.workspace.findUnique({ where: { externalId: workspaceExternalId } });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id
        }
      },
      update: { role },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        role
      }
    });
    await writeAdminAuditLog({
      actorUserId: access.user?.id,
      actorEmail: access.user?.email ?? getOwnerEmail(),
      action: "set_role",
      targetUserEmail: user.email,
      workspaceExternalId,
      metadata: { role }
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "forceResetPassword") {
    const newPassword = body.newPassword?.trim() ?? "";
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "newPassword must be at least 8 characters." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: createPasswordHash(newPassword),
        isActive: true
      }
    });
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    await writeAdminAuditLog({
      actorUserId: access.user?.id,
      actorEmail: access.user?.email ?? getOwnerEmail(),
      action: "force_reset_password",
      targetUserEmail: user.email,
      metadata: { sessionsRevoked: true }
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "deactivate") {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false }
    });
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    await writeAdminAuditLog({
      actorUserId: access.user?.id,
      actorEmail: access.user?.email ?? getOwnerEmail(),
      action: "deactivate_user",
      targetUserEmail: user.email
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reactivate") {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true }
    });
    await writeAdminAuditLog({
      actorUserId: access.user?.id,
      actorEmail: access.user?.email ?? getOwnerEmail(),
      action: "reactivate_user",
      targetUserEmail: user.email
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "killSessions") {
    await prisma.userSession.deleteMany({ where: { userId: user.id } });
    await writeAdminAuditLog({
      actorUserId: access.user?.id,
      actorEmail: access.user?.email ?? getOwnerEmail(),
      action: "kill_sessions",
      targetUserEmail: user.email
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
}
