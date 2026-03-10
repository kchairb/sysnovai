import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";
import { ensurePersistentStorageConfigured } from "@/lib/server/storage-mode";

export type SettingsStore = {
  profileAccount: {
    displayName: string;
    role: string;
    phone: string;
    avatarUrl: string;
  };
  workspaceProfile: {
    workspaceName: string;
    industry: string;
    description: string;
  };
  aiDefaults: {
    defaultLanguage: string;
    secondaryLanguages: string;
    toneDefaults: string;
  };
  security: {
    loginEmail: string;
    mfaStatus: string;
  };
  billing: {
    plan: string;
    usage: string;
    invoiceCycle: string;
  };
  activeSessions: string[];
  updatedAt: string;
};

type EditableSection = Omit<SettingsStore, "updatedAt">;
export type SettingsSection = keyof EditableSection;

const storePath = path.join(process.cwd(), "data", "settings-store.json");

const defaultSettings: SettingsStore = {
  profileAccount: {
    displayName: "Sarra Ayari",
    role: "Founder / Admin",
    phone: "+216 22 000 000",
    avatarUrl: "https://images.example.com/avatar.jpg"
  },
  workspaceProfile: {
    workspaceName: "Sysnova Commerce",
    industry: "Retail / Food",
    description: "Premium Tunisian products with fast delivery and multilingual customer support."
  },
  aiDefaults: {
    defaultLanguage: "French",
    secondaryLanguages: "Darija, Arabic, English",
    toneDefaults: "Warm, premium, concise, trustworthy."
  },
  security: {
    loginEmail: "owner@sysnova.ai",
    mfaStatus: "Enabled on authenticator app"
  },
  billing: {
    plan: "Growth Plan",
    usage: "89,442 requests / month",
    invoiceCycle: "Next invoice: 2026-04-01"
  },
  activeSessions: ["Chrome (Tunis)", "Safari (iPhone)", "Edge (Office)"],
  updatedAt: new Date().toISOString()
};

async function ensureWorkspaceByExternalId(workspaceExternalId: string) {
  const prisma = getPrisma();
  return prisma.workspace.upsert({
    where: { externalId: workspaceExternalId },
    update: {},
    create: {
      externalId: workspaceExternalId,
      name: "Sysnova Workspace",
      slug: `sysnova-workspace-${workspaceExternalId.replace(/[^a-zA-Z0-9]/g, "").slice(-10) || "main"}`
    }
  });
}

async function ensureStoreFile() {
  await mkdir(path.dirname(storePath), { recursive: true });
  try {
    await readFile(storePath, "utf8");
  } catch {
    await writeFile(storePath, JSON.stringify(defaultSettings, null, 2), "utf8");
  }
}

async function readStore(): Promise<SettingsStore> {
  await ensureStoreFile();
  const raw = await readFile(storePath, "utf8");
  return JSON.parse(raw) as SettingsStore;
}

async function writeStore(store: SettingsStore) {
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getSettingsStore(workspaceExternalId = "workspace-default") {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await ensureWorkspaceByExternalId(workspaceExternalId);
    const dbSettings = await prisma.workspaceSettings.upsert({
      where: { workspaceId: workspace.id },
      update: {},
      create: {
        workspaceId: workspace.id,
        profileAccount: defaultSettings.profileAccount,
        workspaceProfile: defaultSettings.workspaceProfile,
        aiDefaults: defaultSettings.aiDefaults,
        security: defaultSettings.security,
        billing: defaultSettings.billing,
        activeSessions: defaultSettings.activeSessions
      }
    });

    return {
      profileAccount: dbSettings.profileAccount as SettingsStore["profileAccount"],
      workspaceProfile: dbSettings.workspaceProfile as SettingsStore["workspaceProfile"],
      aiDefaults: dbSettings.aiDefaults as SettingsStore["aiDefaults"],
      security: dbSettings.security as SettingsStore["security"],
      billing: dbSettings.billing as SettingsStore["billing"],
      activeSessions: dbSettings.activeSessions as SettingsStore["activeSessions"],
      updatedAt: dbSettings.updatedAt.toISOString()
    };
  }

  ensurePersistentStorageConfigured();
  return await readStore();
}

export async function updateSettingsSection<T extends SettingsSection>(
  section: T,
  data: unknown,
  workspaceExternalId = "workspace-default"
) {
  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const workspace = await ensureWorkspaceByExternalId(workspaceExternalId);

    const existing = await prisma.workspaceSettings.upsert({
      where: { workspaceId: workspace.id },
      update: {},
      create: {
        workspaceId: workspace.id,
        profileAccount: defaultSettings.profileAccount,
        workspaceProfile: defaultSettings.workspaceProfile,
        aiDefaults: defaultSettings.aiDefaults,
        security: defaultSettings.security,
        billing: defaultSettings.billing,
        activeSessions: defaultSettings.activeSessions
      }
    });

    const next = {
      profileAccount: existing.profileAccount as SettingsStore["profileAccount"],
      workspaceProfile: existing.workspaceProfile as SettingsStore["workspaceProfile"],
      aiDefaults: existing.aiDefaults as SettingsStore["aiDefaults"],
      security: existing.security as SettingsStore["security"],
      billing: existing.billing as SettingsStore["billing"],
      activeSessions: existing.activeSessions as SettingsStore["activeSessions"]
    };

    if (section === "activeSessions") {
      if (!Array.isArray(data)) {
        throw new Error("activeSessions must be an array.");
      }
      next.activeSessions = data.filter((item): item is string => typeof item === "string");
    } else {
      if (typeof data !== "object" || data === null || Array.isArray(data)) {
        throw new Error("Section payload must be an object.");
      }
      next[section] = {
        ...next[section],
        ...(data as Record<string, unknown>)
      };
    }

    const updated = await prisma.workspaceSettings.update({
      where: { workspaceId: workspace.id },
      data: {
        profileAccount: next.profileAccount,
        workspaceProfile: next.workspaceProfile,
        aiDefaults: next.aiDefaults,
        security: next.security,
        billing: next.billing,
        activeSessions: next.activeSessions
      }
    });

    return {
      profileAccount: updated.profileAccount as SettingsStore["profileAccount"],
      workspaceProfile: updated.workspaceProfile as SettingsStore["workspaceProfile"],
      aiDefaults: updated.aiDefaults as SettingsStore["aiDefaults"],
      security: updated.security as SettingsStore["security"],
      billing: updated.billing as SettingsStore["billing"],
      activeSessions: updated.activeSessions as SettingsStore["activeSessions"],
      updatedAt: updated.updatedAt.toISOString()
    };
  }

  ensurePersistentStorageConfigured();
  const store = await readStore();
  if (section === "activeSessions") {
    if (!Array.isArray(data)) {
      throw new Error("activeSessions must be an array.");
    }
    store.activeSessions = data.filter((item): item is string => typeof item === "string");
  } else {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new Error("Section payload must be an object.");
    }
    store[section] = {
      ...store[section],
      ...(data as Record<string, unknown>)
    };
  }
  store.updatedAt = new Date().toISOString();
  await writeStore(store);
  return store;
}

export function isSettingsSection(value: string): value is SettingsSection {
  return [
    "profileAccount",
    "workspaceProfile",
    "aiDefaults",
    "security",
    "billing",
    "activeSessions"
  ].includes(value);
}
