import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";
import { listBrandKnowledgeEntries } from "@/lib/server/brand-knowledge";
import { listWorkspaceChats } from "@/lib/server/chat-store";
import { listWorkspaceProducts } from "@/lib/server/product-store";

export type DashboardStat = {
  label: string;
  value: string;
  trend: string;
};

export async function getDashboardHomeData(workspaceExternalId: string): Promise<{
  stats: DashboardStat[];
  recentActivity: string[];
}> {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await prisma.workspace.findUnique({
      where: { externalId: workspaceExternalId },
      select: { id: true }
    });
    if (!workspace) {
      return {
        stats: [
          { label: "Replies Generated", value: "0", trend: "No activity yet" },
          { label: "Knowledge Items", value: "0", trend: "No active knowledge yet" },
          { label: "Products Trained", value: "0", trend: "Crawl product pages to auto-fill" },
          { label: "Workspace Chats", value: "0", trend: "Start your first conversation" }
        ],
        recentActivity: ["Workspace ready. Start by crawling brand links in Knowledge > Learn."]
      };
    }

    const [assistantRepliesCount, knowledgeCount, productCount, chatCount, latestChats, latestKnowledge, latestProducts] =
      await Promise.all([
        prisma.workspaceMessage.count({
          where: {
            chat: { workspaceId: workspace.id },
            role: "assistant"
          }
        }),
        prisma.brandKnowledgeEntry.count({
          where: { workspaceId: workspace.id, isActive: true }
        }),
        prisma.product.count({
          where: { workspaceId: workspace.id, isActive: true }
        }),
        prisma.workspaceChat.count({
          where: { workspaceId: workspace.id }
        }),
        prisma.workspaceChat.findMany({
          where: { workspaceId: workspace.id },
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: { title: true }
        }),
        prisma.brandKnowledgeEntry.findMany({
          where: { workspaceId: workspace.id },
          orderBy: { updatedAt: "desc" },
          take: 2,
          select: { title: true, category: true }
        }),
        prisma.product.findMany({
          where: { workspaceId: workspace.id },
          orderBy: { updatedAt: "desc" },
          take: 2,
          select: { name: true }
        })
      ]);

    const recentActivity = [
      ...latestChats.map((item) => `Chat updated: ${item.title}`),
      ...latestKnowledge.map((item) => `Knowledge (${item.category}): ${item.title}`),
      ...latestProducts.map((item) => `Product synced: ${item.name}`)
    ].slice(0, 7);

    return {
      stats: [
        {
          label: "Replies Generated",
          value: assistantRepliesCount.toLocaleString(),
          trend: `${chatCount.toLocaleString()} chats in this workspace`
        },
        {
          label: "Knowledge Items",
          value: knowledgeCount.toLocaleString(),
          trend: "Active brand knowledge entries"
        },
        {
          label: "Products Trained",
          value: productCount.toLocaleString(),
          trend: "Auto-synced from crawl + manual products"
        },
        {
          label: "Workspace Chats",
          value: chatCount.toLocaleString(),
          trend: "Conversation history currently stored"
        }
      ],
      recentActivity: recentActivity.length
        ? recentActivity
        : ["No recent activity yet. Start in Knowledge > Learn."]
    };
  }

  const [knowledge, products, chats] = await Promise.all([
    listBrandKnowledgeEntries({ workspaceId: workspaceExternalId, includeInactive: false, limit: 500 }).catch(
      () => []
    ),
    listWorkspaceProducts({ workspaceId: workspaceExternalId, includeInactive: false, limit: 500 }).catch(
      () => []
    ),
    listWorkspaceChats(workspaceExternalId).catch(() => [])
  ]);

  return {
    stats: [
      {
        label: "Replies Generated",
        value: "0",
        trend: "Assistant message count requires database mode"
      },
      {
        label: "Knowledge Items",
        value: knowledge.length.toLocaleString(),
        trend: "Active brand knowledge entries"
      },
      {
        label: "Products Trained",
        value: products.length.toLocaleString(),
        trend: "Auto-synced from crawl + manual products"
      },
      {
        label: "Workspace Chats",
        value: chats.length.toLocaleString(),
        trend: "Conversation history currently stored"
      }
    ],
    recentActivity: chats.slice(0, 5).map((chat) => `Chat updated: ${chat.title}`)
  };
}
