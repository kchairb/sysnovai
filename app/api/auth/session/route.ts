import { NextResponse } from "next/server";
import {
  authEnabled,
  getAuthenticatedUserFromRequest,
  isDatabaseConnectionError
} from "@/lib/server/auth";

export async function GET(request: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ authenticated: false, reason: "database_not_configured" });
  }
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        { authenticated: false, error: "Database is temporarily unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { authenticated: false, error: "Failed to load session." },
      { status: 500 }
    );
  }
}
