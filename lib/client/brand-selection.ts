"use client";

export const DEFAULT_BRAND_ID = "brand-default";
export const BRAND_STORAGE_KEY = "sysnova_brand_id";
export const BRAND_COOKIE_KEY = "sysnova_brand";
export const BRAND_EVENT = "sysnova:brand-change";

export function getSelectedBrandId() {
  if (typeof window === "undefined") {
    return DEFAULT_BRAND_ID;
  }
  return localStorage.getItem(BRAND_STORAGE_KEY) ?? DEFAULT_BRAND_ID;
}

export function setSelectedBrandId(brandId: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(BRAND_STORAGE_KEY, brandId);
  document.cookie = `${BRAND_COOKIE_KEY}=${brandId}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(BRAND_EVENT, { detail: { brandId } }));
}
