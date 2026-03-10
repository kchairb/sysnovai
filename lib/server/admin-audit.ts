import { getPrisma } from "@/lib/server/db";
import { type Prisma } from "@prisma/client";

export async function writeAdminAuditLog(input: {
  actorUserId?: string | null;
  actorEmail: string;
  action: string;
  targetUserEmail?: string | null;
  workspaceExternalId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const prisma = getPrisma();
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail,
      action: input.action,
      targetUserEmail: input.targetUserEmail ?? null,
      workspaceExternalId: input.workspaceExternalId ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined
    }
  });
}
