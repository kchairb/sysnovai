import { NextResponse } from "next/server";
import { clearSessionCookie, revokeSessionFromRequest } from "@/lib/server/auth";

export async function POST(request: Request) {
  await revokeSessionFromRequest(request);
  const response = NextResponse.json({ ok: true });
  await clearSessionCookie(response);
  return response;
}
