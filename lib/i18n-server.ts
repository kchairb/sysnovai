import { cookies } from "next/headers";
import { normalizeLocale, type AppLocale } from "@/lib/i18n";

export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("sysnova_locale")?.value);
}
