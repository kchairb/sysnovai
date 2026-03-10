import { NextResponse } from "next/server";
import {
  authEnabled,
  createUserSession,
  isDatabaseConnectionError,
  registerWithPassword,
  setSessionCookie
} from "@/lib/server/auth";
import { applyRateLimit } from "@/lib/server/rate-limit";

type Body = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const rateLimited = applyRateLimit(request, {
    bucket: "auth:register",
    limit: 8,
    windowMs: 60_000
  });
  if (rateLimited) return rateLimited;

  if (!authEnabled()) {
    return NextResponse.json(
      { error: "Auth requires DATABASE_URL to be configured." },
      { status: 503 }
    );
  }

  const body = (await request.json()) as Body;
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const user = await registerWithPassword({
      email,
      password,
      name: body.name
    });
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
      { error: error instanceof Error ? error.message : "Failed to register account." },
      { status: 400 }
    );
  }
}
