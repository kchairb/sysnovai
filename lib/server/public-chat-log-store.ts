import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

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
  const store = await readStore();
  return store.logs.slice(0, Math.max(1, limit));
}
