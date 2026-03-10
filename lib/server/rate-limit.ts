import { NextResponse } from "next/server";
import { getPrisma, hasDatabaseUrl } from "@/lib/server/db";

type BucketState = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __sysnovaRateLimitStore: Map<string, BucketState> | undefined;
}

function getStore() {
  if (!global.__sysnovaRateLimitStore) {
    global.__sysnovaRateLimitStore = new Map<string, BucketState>();
  }
  return global.__sysnovaRateLimitStore;
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

function maskClientKey(ip: string) {
  if (!ip.includes(".")) return ip.slice(0, 10);
  const parts = ip.split(".");
  if (parts.length < 4) return ip;
  return `${parts[0]}.${parts[1]}.x.x`;
}

export function applyRateLimit(
  request: Request,
  options: {
    bucket: string;
    limit: number;
    windowMs: number;
  }
) {
  const now = Date.now();
  const ip = getClientIp(request);
  const clientKey = maskClientKey(ip);
  const key = `${options.bucket}:${ip}`;
  const store = getStore();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (current.count >= options.limit) {
    const retryAfterMs = Math.max(0, current.resetAt - now);
    if (hasDatabaseUrl()) {
      void getPrisma().rateLimitEvent
        .create({
          data: {
            bucket: options.bucket,
            method: request.method,
            clientKey,
            retryAfterMs: Math.ceil(retryAfterMs)
          }
        })
        .catch(() => undefined);
    }
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please retry shortly.",
        retryAfterMs
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(retryAfterMs / 1000))
        }
      }
    );
  }

  current.count += 1;
  store.set(key, current);
  return null;
}
