import { type Prisma } from "@prisma/client";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";

type CandidateStatus = "pending" | "approved" | "rejected";
type CandidateLanguage = "darija" | "ar" | "fr" | "en";

export type TunisianLearningCandidateRecord = {
  id: string;
  workspaceId: string;
  phrase: string;
  normalized: string;
  language: string;
  source: string;
  status: CandidateStatus;
  score: number;
  reviewNotes: string | null;
  submittedBy: string | null;
  reviewedBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  reviewedAt: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __sysnovaTunisianLearningQueue: TunisianLearningCandidateRecord[] | undefined;
}

const TUNISIAN_TOKENS = [
  "chnowa",
  "kifeh",
  "brabi",
  "nheb",
  "najem",
  "tawa",
  "bara",
  "3lech",
  "win",
  "chniya",
  "aya",
  "ya3tik",
  "inchallah",
  "mela",
  "7aja",
  "barsha",
  "famma",
  "lezem",
  "belahi",
  "sahha"
];

function normalizePhrase(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function clipText(value: string, maxLength: number) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength);
}

function computeLearningScore(phrase: string, language: CandidateLanguage) {
  const normalized = normalizePhrase(phrase);
  const tokenHits = TUNISIAN_TOKENS.filter((token) => normalized.includes(token)).length;
  const tokenBonus = Math.min(tokenHits * 10, 40);
  const lengthBonus = Math.min(Math.floor(normalized.length / 6), 20);
  const languageBonus = language === "darija" ? 25 : language === "ar" ? 15 : 10;
  const punctuationPenalty = /[{}<>]/.test(normalized) ? 10 : 0;
  return Math.max(0, Math.min(100, 20 + tokenBonus + lengthBonus + languageBonus - punctuationPenalty));
}

function mapRow(
  row: {
    id: string;
    workspaceId: string;
    phrase: string;
    normalized: string;
    language: string;
    source: string;
    status: string;
    score: number;
    reviewNotes: string | null;
    submittedBy: string | null;
    reviewedBy: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    reviewedAt: Date | null;
  }
): TunisianLearningCandidateRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    phrase: row.phrase,
    normalized: row.normalized,
    language: row.language,
    source: row.source,
    status: row.status as CandidateStatus,
    score: row.score,
    reviewNotes: row.reviewNotes,
    submittedBy: row.submittedBy,
    reviewedBy: row.reviewedBy,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null
  };
}

export async function listLearningCandidates(input: {
  workspaceId: string;
  status?: CandidateStatus | "all";
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const status = input.status ?? "pending";

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const rows = await prisma.tunisianLearningCandidate.findMany({
      where: {
        workspaceId: input.workspaceId,
        ...(status === "all" ? {} : { status })
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return rows.map(mapRow);
  }

  const queue = global.__sysnovaTunisianLearningQueue ?? [];
  return queue
    .filter((item) => item.workspaceId === input.workspaceId)
    .filter((item) => (status === "all" ? true : item.status === status))
    .slice(0, limit);
}

export async function createLearningCandidate(input: {
  workspaceId: string;
  phrase: string;
  language: CandidateLanguage;
  source?: string;
  submittedBy?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const phrase = clipText(input.phrase, 500);
  const normalized = normalizePhrase(phrase);
  if (!normalized) {
    throw new Error("Phrase is required.");
  }
  const score = computeLearningScore(normalized, input.language);

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const row = await prisma.tunisianLearningCandidate.create({
      data: {
        workspaceId: input.workspaceId,
        phrase,
        normalized,
        language: input.language,
        source: input.source?.trim() || "manual",
        status: "pending",
        score,
        submittedBy: input.submittedBy ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined
      }
    });
    return mapRow(row);
  }

  const queue = global.__sysnovaTunisianLearningQueue ?? [];
  const created: TunisianLearningCandidateRecord = {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    phrase,
    normalized,
    language: input.language,
    source: input.source?.trim() || "manual",
    status: "pending",
    score,
    reviewNotes: null,
    submittedBy: input.submittedBy ?? null,
    reviewedBy: null,
    metadata: input.metadata ?? null,
    createdAt: new Date().toISOString(),
    reviewedAt: null
  };
  queue.unshift(created);
  global.__sysnovaTunisianLearningQueue = queue.slice(0, 5000);
  return created;
}

export async function reviewLearningCandidate(input: {
  id: string;
  action: "approve" | "reject";
  reviewNotes?: string;
  reviewedBy?: string | null;
}) {
  const nextStatus: CandidateStatus = input.action === "approve" ? "approved" : "rejected";
  const notes = input.reviewNotes?.trim() || null;

  if (hasDatabaseUrl()) {
    const prisma = getPrisma();
    const row = await prisma.tunisianLearningCandidate.update({
      where: { id: input.id },
      data: {
        status: nextStatus,
        reviewNotes: notes,
        reviewedBy: input.reviewedBy ?? null,
        reviewedAt: new Date()
      }
    });
    return mapRow(row);
  }

  const queue = global.__sysnovaTunisianLearningQueue ?? [];
  const target = queue.find((item) => item.id === input.id);
  if (!target) {
    throw new Error("Candidate not found.");
  }
  target.status = nextStatus;
  target.reviewNotes = notes;
  target.reviewedBy = input.reviewedBy ?? null;
  target.reviewedAt = new Date().toISOString();
  return target;
}
