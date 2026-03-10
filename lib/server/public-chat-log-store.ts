import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isFileFallbackEnabled } from "@/lib/server/storage-mode";

export type PublicChatLead = {
  name?: string;
  phone?: string;
};

export type PublicChatLog = {
  id: string;
  domain: string;
  assistantId: string;
  assistantName: string;
  prompt: string;
  reply: string;
  language: string;
  provider: string;
  model: string;
  lead?: PublicChatLead;
  createdAt: string;
};

type PublicChatLogStore = {
  logs: PublicChatLog[];
};

const storePath = path.join(process.cwd(), "data", "public-chat-logs.json");

declare global {
  // eslint-disable-next-line no-var
  var __sysnovaPublicChatLogs: PublicChatLog[] | undefined;
}

async function ensureStoreFile() {
  await mkdir(path.dirname(storePath), { recursive: true });
  try {
    await readFile(storePath, "utf8");
  } catch {
    const initial: PublicChatLogStore = { logs: [] };
    await writeFile(storePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readStore(): Promise<PublicChatLogStore> {
  await ensureStoreFile();
  const raw = await readFile(storePath, "utf8");
  return JSON.parse(raw) as PublicChatLogStore;
}

async function writeStore(store: PublicChatLogStore) {
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export async function appendPublicChatLog(
  input: Omit<PublicChatLog, "id" | "createdAt">
) {
  if (!isFileFallbackEnabled()) {
    const log: PublicChatLog = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input
    };
    const logs = global.__sysnovaPublicChatLogs ?? [];
    logs.unshift(log);
    global.__sysnovaPublicChatLogs = logs.slice(0, 5000);
    return log;
  }

  const store = await readStore();
  const log: PublicChatLog = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  };
  store.logs.unshift(log);
  store.logs = store.logs.slice(0, 5000);
  await writeStore(store);
  return log;
}

export async function listRecentPublicChatLogs(limit = 40) {
  if (!isFileFallbackEnabled()) {
    const logs = global.__sysnovaPublicChatLogs ?? [];
    return logs.slice(0, Math.max(1, limit));
  }

  const store = await readStore();
  return store.logs.slice(0, Math.max(1, limit));
}
