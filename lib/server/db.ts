import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __sysnovaPrisma: PrismaClient | undefined;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrisma() {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!global.__sysnovaPrisma) {
    global.__sysnovaPrisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
    });
  }
  return global.__sysnovaPrisma;
}
