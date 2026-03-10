import { NextResponse } from "next/server";
import {
  authEnabled,
  createUserSession,
  isDatabaseConnectionError,
  loginWithPassword,
  setSessionCookie
} from "@/lib/server/auth";
import { applyRateLimit } from "@/lib/server/rate-limit";

type Body = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const rateLimited = applyRateLimit(request, {
    bucket: "auth:login",
    limit: 12,
    windowMs: 60_000
  });
  if (rateLimited) return rateLimited;

  if (!authEnabled()) {
    return NextResponse.json(
      { error: "Auth requires DATABASE_URL to be configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Body;
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await loginWithPassword({ email, password });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createUserSession(user.id);
    const response = NextResponse.json({ ok: true, user });
    await setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { error: "Database is temporarily unavailable. Please retry in a moment." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 500 }
    );
  }
}
