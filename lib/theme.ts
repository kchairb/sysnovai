export type AppTheme = "dark" | "light";

export function normalizeTheme(value?: string | null): AppTheme {
  return value === "light" ? "light" : "dark";
}
