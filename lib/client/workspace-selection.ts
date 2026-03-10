"use client";

export const DEFAULT_WORKSPACE_ID = "workspace-default";
export const WORKSPACE_STORAGE_KEY = "sysnova_workspace_id";
export const WORKSPACE_COOKIE_KEY = "sysnova_workspace";
export const WORKSPACE_EVENT = "sysnova:workspace-change";

export type WorkspaceOption = {
  id: string;
  name: string;
};

export const workspaceOptions: WorkspaceOption[] = [
  { id: "workspace-default", name: "Sysnova Workspace" },
  { id: "workspace-collection-prestige", name: "Collection Prestige" },
  { id: "workspace-shomokh-store", name: "Shomokh Store" }
];

export function getSelectedWorkspaceId() {
  if (typeof window === "undefined") {
    return DEFAULT_WORKSPACE_ID;
  }
  return localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? DEFAULT_WORKSPACE_ID;
}

export function setSelectedWorkspaceId(workspaceId: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
  document.cookie = `${WORKSPACE_COOKIE_KEY}=${workspaceId}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: { workspaceId } }));
}
