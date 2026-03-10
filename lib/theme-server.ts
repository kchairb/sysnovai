import { cookies } from "next/headers";
import { normalizeTheme, type AppTheme } from "@/lib/theme";

export async function getServerTheme(): Promise<AppTheme> {
  const cookieStore = await cookies();
  return normalizeTheme(cookieStore.get("sysnova_theme")?.value);
}
