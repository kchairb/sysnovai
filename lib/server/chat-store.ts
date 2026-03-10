import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";

type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type StoredChat = {
  id: string;
  workspaceId: string;
  title: string;
  mode: string;
  language: string;
  tone: string;
  createdAt: string;
  updatedAt: string;
};

type ChatStore = {
  chats: StoredChat[];
  messagesByChatId: Record<string, StoredMessage[]>;
};

const storePath = path.join(process.cwd(), "data", "chat-store.json");

async function ensureStoreFile() {
  await mkdir(path.dirname(storePath), { recursive: true });
  try {
    await readFile(storePath, "utf8");
  } catch {
    const initial: ChatStore = { chats: [], messagesByChatId: {} };
    await writeFile(storePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStore(): Promise<ChatStore> {
  await ensureStoreFile();
  const raw = await readFile(storePath, "utf8");
  return JSON.parse(raw) as ChatStore;
}

async function writeStore(store: ChatStore) {
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

function toStoredChat(input: {
  id: string;
  title: string;
  mode: string;
  language: string;
  tone: string;
  createdAt: Date;
  updatedAt: Date;
  workspaceExternalId: string;
}): StoredChat {
  return {
    id: input.id,
    workspaceId: input.workspaceExternalId,
    title: input.title,
    mode: input.mode,
    language: input.language,
    tone: input.tone,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString()
  };
}

function toStoredMessage(input: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}): StoredMessage {
  return {
    id: input.id,
    role: input.role === "user" ? "user" : "assistant",
    content: input.content,
    createdAt: input.createdAt.toISOString()
  };
}

async function ensureWorkspace(externalId: string) {
  const prisma = getPrisma();
  return prisma.workspace.upsert({
    where: { externalId },
    update: {},
    create: {
      externalId,
      name: "Sysnova Workspace",
      slug: `workspace-${externalId.replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "main"}`
    }
  });
}

export async function listWorkspaceChats(workspaceId: string) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await ensureWorkspace(workspaceId);
    const chats = await prisma.workspaceChat.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" }
    });
    return chats.map((chat) =>
      toStoredChat({
        ...chat,
        workspaceExternalId: workspaceId
      })
    );
  }

  const store = await readStore();
  return store.chats
    .filter((chat) => chat.workspaceId === workspaceId)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function createWorkspaceChat(input: {
  workspaceId: string;
  title?: string;
  mode?: string;
  language?: string;
  tone?: string;
}) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await ensureWorkspace(input.workspaceId);
    const chat = await prisma.workspaceChat.create({
      data: {
        workspaceId: workspace.id,
        title: input.title?.trim() || "New conversation",
        mode: input.mode ?? "support",
        language: input.language ?? "fr",
        tone: input.tone ?? "Warm, premium, trustworthy",
        messages: {
          create: [
            {
              role: "assistant",
              content: "New chat ready. Write your first prompt."
            }
          ]
        }
      }
    });
    return toStoredChat({
      ...chat,
      workspaceExternalId: input.workspaceId
    });
  }

  const store = await readStore();
  const now = new Date().toISOString();
  const chat: StoredChat = {
    id: randomUUID(),
    workspaceId: input.workspaceId,
    title: input.title?.trim() || "New conversation",
    mode: input.mode ?? "support",
    language: input.language ?? "fr",
    tone: input.tone ?? "Warm, premium, trustworthy",
    createdAt: now,
    updatedAt: now
  };
  store.chats.unshift(chat);
  store.messagesByChatId[chat.id] = [
    {
      id: randomUUID(),
      role: "assistant",
      content: "New chat ready. Write your first prompt.",
      createdAt: now
    }
  ];
  await writeStore(store);
  return chat;
}

export async function getChatById(chatId: string) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const chat = await prisma.workspaceChat.findUnique({
      where: { id: chatId },
      include: { workspace: true }
    });
    if (!chat) return null;
    return toStoredChat({
      ...chat,
      workspaceExternalId: chat.workspace.externalId
    });
  }

  const store = await readStore();
  return store.chats.find((chat) => chat.id === chatId) ?? null;
}

export async function getChatMessages(chatId: string) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const messages = await prisma.workspaceMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" }
    });
    return messages.map(toStoredMessage);
  }

  const store = await readStore();
  return store.messagesByChatId[chatId] ?? [];
}

export async function appendMessage(
  chatId: string,
  message: { role: "user" | "assistant"; content: string },
  expectedWorkspaceId?: string
) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const chat = await prisma.workspaceChat.findUnique({
      where: { id: chatId },
      include: { workspace: true }
    });
    if (!chat) {
      throw new Error("Chat not found");
    }
    if (expectedWorkspaceId && chat.workspace.externalId !== expectedWorkspaceId) {
      throw new Error("Chat does not belong to workspace");
    }

    const created = await prisma.workspaceMessage.create({
      data: {
        chatId,
        role: message.role,
        content: message.content
      }
    });

    const titleUpdate =
      message.role === "user" && chat.title === "New conversation"
        ? { title: message.content.slice(0, 42) || chat.title }
        : {};

    await prisma.workspaceChat.update({
      where: { id: chatId },
      data: {
        ...titleUpdate,
        updatedAt: new Date()
      }
    });

    return toStoredMessage(created);
  }

  const store = await readStore();
  const chat = store.chats.find((item) => item.id === chatId);
  if (!chat) {
    throw new Error("Chat not found");
  }
  if (expectedWorkspaceId && chat.workspaceId !== expectedWorkspaceId) {
    throw new Error("Chat does not belong to workspace");
  }

  const now = new Date().toISOString();
  const next: StoredMessage = {
    id: randomUUID(),
    role: message.role,
    content: message.content,
    createdAt: now
  };

  if (!store.messagesByChatId[chatId]) {
    store.messagesByChatId[chatId] = [];
  }
  store.messagesByChatId[chatId].push(next);

  if (message.role === "user" && chat.title === "New conversation") {
    chat.title = message.content.slice(0, 42) || chat.title;
  }
  chat.updatedAt = now;

  await writeStore(store);
  return next;
}
