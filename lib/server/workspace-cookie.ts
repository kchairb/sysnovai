import { cookies } from "next/headers";

const DEFAULT_WORKSPACE_ID = "workspace-default";

export async function getServerWorkspaceId() {
  const cookieStore = await cookies();
  return cookieStore.get("sysnova_workspace")?.value?.trim() || DEFAULT_WORKSPACE_ID;
}
