import { type AuthUser } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/db";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureWorkspaceForRequest(
  user: AuthUser,
  workspaceExternalId: string
) {
  const prisma = getPrisma();
  const userEmail = user.email.trim().toLowerCase();

  const workspaceName = "Sysnova Workspace";
  const slugBase =
    normalizeSlug(workspaceName) || "sysnova-workspace";

  const [dbUser, workspace] = await Promise.all([
    prisma.user.upsert({
      where: { email: userEmail },
      update: { name: user.name ?? undefined },
      create: {
        email: userEmail,
        name: user.name ?? userEmail.split("@")[0]
      }
    }),
    prisma.workspace.upsert({
      where: { externalId: workspaceExternalId },
      update: {},
      create: {
        externalId: workspaceExternalId,
        name: workspaceName,
        slug: `${slugBase}-${workspaceExternalId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "main"}`
      }
    })
  ]);

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: dbUser.id
      }
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: dbUser.id,
      role: "owner"
    }
  });

  return { user: dbUser, workspace };
}
