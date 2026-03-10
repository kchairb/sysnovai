import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { type NextResponse } from "next/server";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";

const SESSION_COOKIE = "sysnova_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export function isDatabaseConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lowered = message.toLowerCase();
  return (
    lowered.includes("can't reach database server") ||
    lowered.includes("p1001") ||
    lowered.includes("econnrefused") ||
    lowered.includes("etimedout") ||
    lowered.includes("enotfound")
  );
}

export function createPasswordHash(password: string, salt?: string) {
  const usedSalt = salt ?? randomBytes(16).toString("hex");
  const derived = scryptSync(password, usedSalt, 64);
  return `${usedSalt}:${derived.toString("hex")}`;
}

function verifyPassword(password: string, passwordHash: string) {
  const [salt, digest] = passwordHash.split(":");
  if (!salt || !digest) return false;
  const next = scryptSync(password, salt, 64);
  const stored = Buffer.from(digest, "hex");
  if (stored.length !== next.length) return false;
  return timingSafeEqual(stored, next);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookieValue(rawCookie: string | null, name: string) {
  if (!rawCookie) return null;
  const parts = rawCookie.split(";").map((part) => part.trim());
  const pair = parts.find((part) => part.startsWith(`${name}=`));
  if (!pair) return null;
  return decodeURIComponent(pair.slice(name.length + 1));
}

export function authEnabled() {
  return hasDatabaseUrl();
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  name?: string;
}) {
  const prisma = getPrisma();
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || null;
  let existing = null as Awaited<ReturnType<typeof prisma.user.findUnique>>;
  try {
    existing = await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      throw new Error("Database is temporarily unavailable.");
    }
    throw error;
  }
  if (existing?.passwordHash) {
    throw new Error("Account already exists.");
  }

  const passwordHash = createPasswordHash(input.password);
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { name: name ?? existing.name, passwordHash }
      })
    : await prisma.user.create({
        data: {
          email,
          name,
          passwordHash
        }
      });

  return { id: user.id, email: user.email, name: user.name } satisfies AuthUser;
}

export async function loginWithPassword(input: { email: string; password: string }) {
  const prisma = getPrisma();
  const email = input.email.trim().toLowerCase();
  let user = null as Awaited<ReturnType<typeof prisma.user.findUnique>>;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      throw new Error("Database is temporarily unavailable.");
    }
    throw error;
  }
  if (!user?.passwordHash || !user.isActive) return null;
  if (!verifyPassword(input.password, user.passwordHash)) return null;
  return { id: user.id, email: user.email, name: user.name } satisfies AuthUser;
}

export async function createUserSession(userId: string) {
  const prisma = getPrisma();
  const token = randomBytes(32).toString("base64url");
  try {
    await prisma.userSession.create({
      data: {
        userId,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
      }
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      throw new Error("Database is temporarily unavailable.");
    }
    throw error;
  }
  return token;
}

export async function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export async function getAuthenticatedUserFromRequest(request: Request): Promise<AuthUser | null> {
  if (!authEnabled()) return null;
  const token = parseCookieValue(request.headers.get("cookie"), SESSION_COOKIE);
  if (!token) return null;
  const prisma = getPrisma();
  let session: {
    id: string;
    expiresAt: Date;
    user: { id: string; email: string; name: string | null; isActive: boolean };
  } | null = null;
  try {
    session = await prisma.userSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true }
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return null;
    }
    throw error;
  }
  if (!session) return null;
  if (!session.user.isActive) {
    await prisma.userSession.deleteMany({ where: { userId: session.user.id } }).catch(() => undefined);
    return null;
  }
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name
  };
}

export async function getAuthenticatedUserFromCookies(): Promise<AuthUser | null> {
  if (!authEnabled()) return null;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const prisma = getPrisma();
  let session: {
    id: string;
    expiresAt: Date;
    user: { id: string; email: string; name: string | null; isActive: boolean };
  } | null = null;
  try {
    session = await prisma.userSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true }
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return null;
    }
    throw error;
  }
  if (!session) return null;
  if (!session.user.isActive) {
    await prisma.userSession.deleteMany({ where: { userId: session.user.id } }).catch(() => undefined);
    return null;
  }
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name
  };
}

export async function revokeSessionFromRequest(request: Request) {
  if (!authEnabled()) return;
  const token = parseCookieValue(request.headers.get("cookie"), SESSION_COOKIE);
  if (!token) return;
  const prisma = getPrisma();
  try {
    await prisma.userSession.deleteMany({
      where: { tokenHash: hashSessionToken(token) }
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return;
    }
    throw error;
  }
}
