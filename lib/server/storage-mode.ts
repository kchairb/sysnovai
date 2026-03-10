export const PRODUCTION_STORAGE_ERROR =
  "Persistent storage is required in production. Set DATABASE_URL in environment variables.";

export function isFileFallbackEnabled() {
  if (process.env.ALLOW_FILE_FALLBACK === "1") {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

export function ensurePersistentStorageConfigured() {
  if (!isFileFallbackEnabled()) {
    throw new Error(PRODUCTION_STORAGE_ERROR);
  }
}
