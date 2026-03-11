"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminSummary = {
  users: number;
  workspaces: number;
  activeSessions: number;
};

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  memberships: Array<{
    workspaceId: string;
    workspaceName: string;
    role: string;
  }>;
};

type AdminAuditLog = {
  id: string;
  actorEmail: string;
  action: string;
  targetUserEmail: string | null;
  workspaceExternalId: string | null;
  createdAt: string;
};

type AdminInvitation = {
  id: string;
  email: string;
  role: string;
  workspaceExternalId: string;
  workspaceName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

type ReliabilityAlert = {
  id: string;
  type: "provider" | "rate-limit";
  severity: "high" | "medium";
  message: string;
  at: string;
};

export default function AdminPage() {
  const { tr } = useLocale();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createWorkspaceId, setCreateWorkspaceId] = useState("workspace-default");
  const [createWorkspaceName, setCreateWorkspaceName] = useState("Sysnova Workspace");
  const [createRole, setCreateRole] = useState("viewer");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState("workspace-default");
  const [inviteWorkspaceName, setInviteWorkspaceName] = useState("Sysnova Workspace");
  const [inviteLanguage, setInviteLanguage] = useState<"en" | "fr" | "ar">("en");
  const [sendInviteEmailEnabled, setSendInviteEmailEnabled] = useState(true);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [lastInviteLink, setLastInviteLink] = useState("");
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [auditSearch, setAuditSearch] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditActor, setAuditActor] = useState("");
  const [auditWorkspace, setAuditWorkspace] = useState("");
  const [auditTarget, setAuditTarget] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [info, setInfo] = useState("");
  const [alerts, setAlerts] = useState<ReliabilityAlert[]>([]);
  const [rateSummary, setRateSummary] = useState<{ totalEvents: number } | null>(null);
  const [rateBuckets, setRateBuckets] = useState<Array<{ bucket: string; count: number }>>([]);
  const [rateClients, setRateClients] = useState<Array<{ clientKey: string; count: number }>>([]);
  const [opsWindowMinutes, setOpsWindowMinutes] = useState(60);

  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const query = new URLSearchParams();
      if (auditSearch.trim()) query.set("search", auditSearch.trim());
      if (auditAction.trim()) query.set("action", auditAction.trim());
      if (auditActor.trim()) query.set("actor", auditActor.trim());
      if (auditWorkspace.trim()) query.set("workspace", auditWorkspace.trim());
      if (auditTarget.trim()) query.set("target", auditTarget.trim());
      if (auditFrom) query.set("from", auditFrom);
      if (auditTo) query.set("to", auditTo);
      const response = await fetch(`/api/admin/accounts?${query.toString()}`);
      const payload = (await response.json()) as {
        summary?: AdminSummary;
        users?: AdminUser[];
        auditLogs?: AdminAuditLog[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load admin accounts.");
      }
      setSummary(payload.summary ?? null);
      setUsers(payload.users ?? []);
      setLogs(payload.auditLogs ?? []);
      const invitesResponse = await fetch("/api/admin/invitations");
      if (invitesResponse.ok) {
        const invitesPayload = (await invitesResponse.json()) as {
          invitations?: AdminInvitation[];
        };
        setInvitations(invitesPayload.invitations ?? []);
      }
      const [alertsResponse, rateResponse] = await Promise.all([
        fetch(`/api/admin/reliability/alerts?windowMinutes=${opsWindowMinutes}`),
        fetch(`/api/admin/security/rate-limits?windowMinutes=${opsWindowMinutes}`)
      ]);
      if (alertsResponse.ok) {
        const alertsPayload = (await alertsResponse.json()) as { alerts?: ReliabilityAlert[] };
        setAlerts(alertsPayload.alerts ?? []);
      }
      if (rateResponse.ok) {
        const ratePayload = (await rateResponse.json()) as {
          summary?: { totalEvents: number };
          topBuckets?: Array<{ bucket: string; count: number }>;
          topClients?: Array<{ clientKey: string; count: number }>;
        };
        setRateSummary(ratePayload.summary ?? null);
        setRateBuckets(ratePayload.topBuckets ?? []);
        setRateClients(ratePayload.topClients ?? []);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load admin accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opsWindowMinutes]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        `${user.name ?? ""} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [users, search]
  );

  const updateRole = async (workspaceId: string, userEmail: string, role: string) => {
    const key = `${workspaceId}:${userEmail}`;
    setSavingKey(key);
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setRole", workspaceExternalId: workspaceId, userEmail, role })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update role.");
      }
      await loadAccounts();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update role.");
    } finally {
      setSavingKey("");
    }
  };

  const createUser = async () => {
    setSavingKey("create-user");
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          workspaceExternalId: createWorkspaceId,
          workspaceName: createWorkspaceName,
          role: createRole
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create user.");
      }
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      await loadAccounts();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to create user.");
    } finally {
      setSavingKey("");
    }
  };

  const runUserAction = async (
    action: "forceResetPassword" | "deactivate" | "reactivate" | "killSessions",
    userEmail: string,
    payload: Record<string, unknown> = {}
  ) => {
    const key = `${action}:${userEmail}`;
    setSavingKey(key);
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userEmail,
          ...payload
        })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Admin action failed.");
      }
      await loadAccounts();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Admin action failed.");
    } finally {
      setSavingKey("");
    }
  };

  const createInvite = async () => {
    setSavingKey("create-invite");
    setError("");
    setLastInviteLink("");
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          workspaceExternalId: inviteWorkspaceId,
          workspaceName: inviteWorkspaceName,
          role: inviteRole,
          expiresInDays,
          language: inviteLanguage,
          sendEmail: sendInviteEmailEnabled
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        invitation?: {
          inviteLink?: string;
          delivery?: { delivered?: boolean; provider?: string; reason?: string | null };
        };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create invite.");
      }
      setLastInviteLink(payload.invitation?.inviteLink ?? "");
      if (sendInviteEmailEnabled) {
        if (payload.invitation?.delivery?.delivered) {
          setInfo(`Invite email sent via ${payload.invitation.delivery.provider}.`);
        } else {
          setInfo(payload.invitation?.delivery?.reason ?? "Invite created, but email was not delivered.");
        }
      }
      setInviteEmail("");
      await loadAccounts();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to create invite.");
    } finally {
      setSavingKey("");
    }
  };

  const revokeInvite = async (invitationId: string) => {
    setSavingKey(`revoke:${invitationId}`);
    setError("");
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", invitationId })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to revoke invite.");
      }
      await loadAccounts();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to revoke invite.");
    } finally {
      setSavingKey("");
    }
  };

  const retryInviteEmail = async (invitationId: string) => {
    setSavingKey(`retry:${invitationId}`);
    setError("");
    setInfo("");
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retryEmail", invitationId, language: inviteLanguage })
      });
      const payload = (await response.json()) as {
        error?: string;
        delivery?: { delivered?: boolean; provider?: string; reason?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to retry invite email.");
      }
      if (payload.delivery?.delivered) {
        setInfo(`Invite email resent via ${payload.delivery.provider}.`);
      } else {
        setInfo(payload.delivery?.reason ?? "Invite email retry was not delivered.");
      }
      await loadAccounts();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to retry invite email.");
    } finally {
      setSavingKey("");
    }
  };

  const exportAuditCsv = () => {
    const query = new URLSearchParams();
    if (auditSearch.trim()) query.set("search", auditSearch.trim());
    if (auditAction.trim()) query.set("action", auditAction.trim());
    if (auditActor.trim()) query.set("actor", auditActor.trim());
    if (auditWorkspace.trim()) query.set("workspace", auditWorkspace.trim());
    if (auditTarget.trim()) query.set("target", auditTarget.trim());
    if (auditFrom) query.set("from", auditFrom);
    if (auditTo) query.set("to", auditTo);
    query.set("format", "csv");
    window.open(`/api/admin/accounts?${query.toString()}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <section className="premium-page-hero">
        <p className="premium-page-kicker">{tr("admin.kicker", "Admin")}</p>
        <h1 className="premium-page-title">{tr("admin.title", "Accounts, workspaces, and access control")}</h1>
        <p className="premium-page-description">
          {tr(
            "admin.description",
            "Central admin panel for user governance, workspace membership roles, and session overview."
          )}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="premium-panel p-4">
          <p className="text-xs text-secondary">{tr("admin.users", "Users")}</p>
          <p className="mt-2 text-2xl font-semibold">{summary?.users ?? 0}</p>
        </article>
        <article className="premium-panel p-4">
          <p className="text-xs text-secondary">{tr("admin.workspaces", "Workspaces")}</p>
          <p className="mt-2 text-2xl font-semibold">{summary?.workspaces ?? 0}</p>
        </article>
        <article className="premium-panel p-4">
          <p className="text-xs text-secondary">{tr("admin.activeSessions", "Active sessions")}</p>
          <p className="mt-2 text-2xl font-semibold">{summary?.activeSessions ?? 0}</p>
        </article>
      </section>

      <section className="premium-panel p-4">
        <h2 className="premium-section-title">{tr("admin.inviteByEmail", "Invite by email")}</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Input
            placeholder="Invite email"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
          />
          <select
            className="rounded-md border border-border/80 bg-surface px-2 py-2 text-xs"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
          >
            <option value="owner">owner</option>
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
          <Input
            placeholder="Workspace external id"
            value={inviteWorkspaceId}
            onChange={(event) => setInviteWorkspaceId(event.target.value)}
          />
          <Input
            placeholder="Workspace display name"
            value={inviteWorkspaceName}
            onChange={(event) => setInviteWorkspaceName(event.target.value)}
          />
          <select
            className="rounded-md border border-border/80 bg-surface px-2 py-2 text-xs"
            value={inviteLanguage}
            onChange={(event) => setInviteLanguage(event.target.value as "en" | "fr" | "ar")}
          >
            <option value="en">English template</option>
            <option value="fr">Template francais</option>
            <option value="ar">قالب عربي</option>
          </select>
          <label className="flex items-center gap-2 rounded-md border border-border/80 bg-surface px-2 py-2 text-xs text-secondary">
            <input
              type="checkbox"
              checked={sendInviteEmailEnabled}
              onChange={(event) => setSendInviteEmailEnabled(event.target.checked)}
            />
            Send invite email now
          </label>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={1}
            max={30}
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(Number(event.target.value || 7))}
            className="h-8 w-28"
          />
          <Button
            size="sm"
            onClick={() => void createInvite()}
            disabled={savingKey === "create-invite"}
          >
            {savingKey === "create-invite" ? "Creating..." : "Create invite link"}
          </Button>
          {lastInviteLink && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(lastInviteLink)}
            >
              Copy link
            </Button>
          )}
        </div>
        {lastInviteLink && (
          <p className="mt-2 truncate rounded-lg border border-border/70 bg-elevated/20 px-3 py-2 text-xs text-secondary">
            {lastInviteLink}
          </p>
        )}
        {info && (
          <p className="mt-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
            {info}
          </p>
        )}
      </section>

      <section className="premium-panel p-4">
        <h2 className="premium-section-title">{tr("admin.pendingInvitations", "Pending invitations")}</h2>
        <div className="mt-3 space-y-2">
          {invitations.map((invite) => (
            <div
              key={invite.id}
              className="rounded-lg border border-border/70 bg-elevated/25 px-3 py-2 text-xs text-secondary"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{invite.email}</p>
                  <p>
                    {invite.workspaceName} ({invite.workspaceExternalId}) · role: {invite.role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted">
                    expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={savingKey === `retry:${invite.id}`}
                    onClick={() => void retryInviteEmail(invite.id)}
                  >
                    {tr("admin.resendEmail", "Resend email")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingKey === `revoke:${invite.id}`}
                    onClick={() => void revokeInvite(invite.id)}
                  >
                    {tr("common.revoke", "Revoke")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!invitations.length && !loading && (
            <p className="rounded-lg border border-border/70 bg-elevated/20 px-3 py-2 text-xs text-muted">
              {tr("admin.noPendingInvitations", "No pending invitations.")}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="premium-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="premium-section-title">{tr("admin.reliabilityAlerts", "Reliability alerts")}</h2>
            <Input
              type="number"
              min={5}
              max={720}
              value={opsWindowMinutes}
              onChange={(event) => setOpsWindowMinutes(Number(event.target.value || 60))}
              className="h-8 w-28"
            />
          </div>
          <div className="mt-3 space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  alert.severity === "high"
                    ? "border-error/40 bg-error/10 text-error"
                    : "border-warning/40 bg-warning/10 text-secondary"
                }`}
              >
                <p className="font-medium">{alert.message}</p>
                <p className="mt-1 text-muted">{new Date(alert.at).toLocaleString()}</p>
              </div>
            ))}
            {!alerts.length && (
              <p className="rounded-lg border border-border/70 bg-elevated/20 px-3 py-2 text-xs text-muted">
                {tr("admin.noReliabilityAlerts", "No reliability alerts in selected window.")}
              </p>
            )}
          </div>
        </article>

        <article className="premium-panel p-4">
          <h2 className="premium-section-title">{tr("admin.rateLimitInsights", "Rate-limit insights")}</h2>
          <p className="mt-2 text-xs text-secondary">
            Window: last {opsWindowMinutes} min · total throttles: {rateSummary?.totalEvents ?? 0}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-secondary">Top endpoints</p>
              <div className="mt-2 space-y-1">
                {rateBuckets.map((item) => (
                  <div
                    key={item.bucket}
                    className="rounded-lg border border-border/70 bg-elevated/25 px-2.5 py-2 text-xs text-secondary"
                  >
                    <p className="font-medium text-foreground">{item.bucket}</p>
                    <p>{item.count} throttles</p>
                  </div>
                ))}
                {!rateBuckets.length && (
                  <p className="rounded-lg border border-border/70 bg-elevated/20 px-2.5 py-2 text-xs text-muted">
                    {tr("admin.noEndpointThrottles", "No endpoint throttles.")}
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-secondary">Top client keys</p>
              <div className="mt-2 space-y-1">
                {rateClients.map((item) => (
                  <div
                    key={item.clientKey}
                    className="rounded-lg border border-border/70 bg-elevated/25 px-2.5 py-2 text-xs text-secondary"
                  >
                    <p className="font-medium text-foreground">{item.clientKey}</p>
                    <p>{item.count} throttles</p>
                  </div>
                ))}
                {!rateClients.length && (
                  <p className="rounded-lg border border-border/70 bg-elevated/20 px-2.5 py-2 text-xs text-muted">
                    {tr("admin.noClientThrottles", "No client throttles.")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="premium-panel p-4">
        <h2 className="premium-section-title">{tr("admin.createUserManually", "Create user manually")}</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Input
            placeholder="Name"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
          />
          <Input
            placeholder="Email"
            type="email"
            value={createEmail}
            onChange={(event) => setCreateEmail(event.target.value)}
          />
          <Input
            placeholder="Temporary password"
            value={createPassword}
            onChange={(event) => setCreatePassword(event.target.value)}
          />
          <select
            className="rounded-md border border-border/80 bg-surface px-2 py-2 text-xs"
            value={createRole}
            onChange={(event) => setCreateRole(event.target.value)}
          >
            <option value="owner">owner</option>
            <option value="admin">admin</option>
            <option value="editor">editor</option>
            <option value="viewer">viewer</option>
          </select>
          <Input
            placeholder="Workspace external id"
            value={createWorkspaceId}
            onChange={(event) => setCreateWorkspaceId(event.target.value)}
          />
          <Input
            placeholder="Workspace display name"
            value={createWorkspaceName}
            onChange={(event) => setCreateWorkspaceName(event.target.value)}
          />
        </div>
        <div className="mt-2">
          <Button
            size="sm"
            onClick={() => void createUser()}
            disabled={savingKey === "create-user"}
          >
            {savingKey === "create-user"
              ? tr("common.creating", "Creating...")
              : tr("admin.createUser", "Create user")}
          </Button>
        </div>
      </section>

      <section className="premium-panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="max-w-sm"
          />
          <Button size="sm" variant="secondary" onClick={() => void loadAccounts()} disabled={loading}>
            {tr("common.refresh", "Refresh")}
          </Button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {filteredUsers.map((user) => (
            <article key={user.id} className="premium-subpanel p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{user.name ?? "Unnamed user"}</p>
                  <p className="text-xs text-secondary">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.isActive ? "success" : "default"}>
                    {user.isActive ? "active" : "inactive"}
                  </Badge>
                  <Badge>{new Date(user.createdAt).toLocaleDateString()}</Badge>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {user.memberships.length === 0 && (
                  <p className="text-xs text-muted">
                    {tr("admin.noWorkspaceMemberships", "No workspace memberships yet.")}
                  </p>
                )}
                {user.memberships.map((membership) => {
                  const rowKey = `${membership.workspaceId}:${user.email}`;
                  return (
                    <div
                      key={rowKey}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-elevated/25 px-2.5 py-2"
                    >
                      <div>
                        <p className="text-xs font-medium">{membership.workspaceName}</p>
                        <p className="text-[11px] text-muted">{membership.workspaceId}</p>
                      </div>
                      <select
                        className="rounded-md border border-border/80 bg-surface px-2 py-1 text-xs"
                        value={membership.role}
                        disabled={savingKey === rowKey}
                        onChange={(event) =>
                          void updateRole(membership.workspaceId, user.email, event.target.value)
                        }
                      >
                        <option value="owner">owner</option>
                        <option value="admin">admin</option>
                        <option value="editor">editor</option>
                        <option value="viewer">viewer</option>
                      </select>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg border border-border/70 bg-elevated/25 p-2">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Admin actions
                </p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="New password"
                    value={resetPasswords[user.email] ?? ""}
                    onChange={(event) =>
                      setResetPasswords((prev) => ({ ...prev, [user.email]: event.target.value }))
                    }
                    className="h-8 max-w-[220px]"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={savingKey === `forceResetPassword:${user.email}`}
                    onClick={() =>
                      void runUserAction("forceResetPassword", user.email, {
                        newPassword: resetPasswords[user.email] ?? ""
                      })
                    }
                  >
                    {tr("admin.forceResetPassword", "Force reset password")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={savingKey === `killSessions:${user.email}`}
                    onClick={() => void runUserAction("killSessions", user.email)}
                  >
                    {tr("admin.killSessions", "Kill sessions")}
                  </Button>
                  {user.isActive ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingKey === `deactivate:${user.email}`}
                      onClick={() => void runUserAction("deactivate", user.email)}
                    >
                      {tr("admin.deactivate", "Deactivate")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingKey === `reactivate:${user.email}`}
                      onClick={() => void runUserAction("reactivate", user.email)}
                    >
                      {tr("admin.reactivate", "Reactivate")}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {!filteredUsers.length && !loading && (
            <p className="rounded-lg border border-border/70 bg-elevated/20 px-3 py-2 text-xs text-muted">
              {tr("admin.noUsersFound", "No users found.")}
            </p>
          )}
        </div>
      </section>

      <section className="premium-panel p-4">
        <h2 className="premium-section-title">{tr("admin.auditLog", "Audit log")}</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          <Input
            value={auditSearch}
            onChange={(event) => setAuditSearch(event.target.value)}
            placeholder="Search all"
          />
          <Input
            value={auditAction}
            onChange={(event) => setAuditAction(event.target.value)}
            placeholder="Filter action"
          />
          <Input
            value={auditActor}
            onChange={(event) => setAuditActor(event.target.value)}
            placeholder="Filter actor email"
          />
          <Input
            value={auditWorkspace}
            onChange={(event) => setAuditWorkspace(event.target.value)}
            placeholder="Filter workspace"
          />
          <Input
            value={auditTarget}
            onChange={(event) => setAuditTarget(event.target.value)}
            placeholder="Filter target email"
          />
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Input type="date" value={auditFrom} onChange={(event) => setAuditFrom(event.target.value)} />
          <Input type="date" value={auditTo} onChange={(event) => setAuditTo(event.target.value)} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => void loadAccounts()}>
            {tr("common.applyFilters", "Apply filters")}
          </Button>
          <Button size="sm" variant="outline" onClick={exportAuditCsv}>
            {tr("common.exportCsv", "Export CSV")}
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-lg border border-border/70 bg-elevated/25 px-3 py-2 text-xs text-secondary"
            >
              <span className="font-medium text-foreground">{log.action}</span>
              {" · "}by {log.actorEmail}
              {log.targetUserEmail ? ` · target: ${log.targetUserEmail}` : ""}
              {log.workspaceExternalId ? ` · workspace: ${log.workspaceExternalId}` : ""}
              <span className="ml-1 text-muted">
                ({new Date(log.createdAt).toLocaleString()})
              </span>
            </div>
          ))}
          {!logs.length && !loading && (
            <p className="rounded-lg border border-border/70 bg-elevated/20 px-3 py-2 text-xs text-muted">
              {tr("admin.noAuditEvents", "No audit events yet.")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
