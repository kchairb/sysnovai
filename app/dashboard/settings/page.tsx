"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LlmProviderCard } from "@/components/dashboard/llm-provider-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  DEFAULT_WORKSPACE_ID,
  getSelectedWorkspaceId,
  WORKSPACE_EVENT
} from "@/lib/client/workspace-selection";

type Toast = { id: string; type: "success" | "error"; message: string };
type SettingsStore = {
  profileAccount: {
    displayName: string;
    role: string;
    phone: string;
    avatarUrl: string;
  };
  workspaceProfile: {
    workspaceName: string;
    industry: string;
    description: string;
  };
  aiDefaults: {
    defaultLanguage: string;
    secondaryLanguages: string;
    toneDefaults: string;
  };
  security: {
    loginEmail: string;
    mfaStatus: string;
  };
  billing: {
    plan: string;
    usage: string;
    invoiceCycle: string;
  };
  activeSessions: string[];
};

export default function SettingsPage() {
  const { tr } = useLocale();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

  const [displayName, setDisplayName] = useState("Sarra Ayari");
  const [role, setRole] = useState("Founder / Admin");
  const [phone, setPhone] = useState("+216 22 000 000");
  const [avatarUrl, setAvatarUrl] = useState("https://images.example.com/avatar.jpg");

  const [workspaceName, setWorkspaceName] = useState("Sysnova Commerce");
  const [industry, setIndustry] = useState("Retail / Food");
  const [description, setDescription] = useState(
    "Premium Tunisian products with fast delivery and multilingual customer support."
  );

  const [defaultLanguage, setDefaultLanguage] = useState("French");
  const [secondaryLanguages, setSecondaryLanguages] = useState("Darija, Arabic, English");
  const [toneDefaults, setToneDefaults] = useState("Warm, premium, concise, trustworthy.");

  const [loginEmail, setLoginEmail] = useState("owner@sysnova.ai");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mfaStatus, setMfaStatus] = useState("Enabled on authenticator app");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityError, setSecurityError] = useState("");
  const [billingPlan, setBillingPlan] = useState("Growth Plan");
  const [billingUsage, setBillingUsage] = useState("89,442 requests / month");
  const [billingCycle, setBillingCycle] = useState("Next invoice: 2026-04-01");
  const [activeSessions, setActiveSessions] = useState<string[]>([
    "Chrome (Tunis)",
    "Safari (iPhone)",
    "Edge (Office)"
  ]);

  const pushToast = (type: Toast["type"], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  };

  const runSave = async (
    key: string,
    onValidate?: () => string | null,
    onSave?: () => Promise<void>
  ) => {
    const validationError = onValidate?.();
    if (validationError) {
      pushToast("error", validationError);
      return;
    }
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await onSave?.();
      pushToast("success", tr("settings.saved", "Settings saved successfully."));
    } catch (error) {
      pushToast(
        "error",
        error instanceof Error ? error.message : tr("settings.saveFailed", "Failed to save settings.")
      );
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const response = await fetch(`/api/settings?workspaceId=${workspaceId}`);
      if (!response.ok) throw new Error(tr("settings.loadFailed", "Failed to load settings."));
      const payload = (await response.json()) as { settings: SettingsStore };
      const settings = payload.settings;
      setDisplayName(settings.profileAccount.displayName);
      setRole(settings.profileAccount.role);
      setPhone(settings.profileAccount.phone);
      setAvatarUrl(settings.profileAccount.avatarUrl);
      setWorkspaceName(settings.workspaceProfile.workspaceName);
      setIndustry(settings.workspaceProfile.industry);
      setDescription(settings.workspaceProfile.description);
      setDefaultLanguage(settings.aiDefaults.defaultLanguage);
      setSecondaryLanguages(settings.aiDefaults.secondaryLanguages);
      setToneDefaults(settings.aiDefaults.toneDefaults);
      setLoginEmail(settings.security.loginEmail);
      setMfaStatus(settings.security.mfaStatus);
      setBillingPlan(settings.billing.plan);
      setBillingUsage(settings.billing.usage);
      setBillingCycle(settings.billing.invoiceCycle);
      setActiveSessions(settings.activeSessions);
    } catch (error) {
      pushToast(
        "error",
        error instanceof Error ? error.message : tr("settings.loadFailed", "Failed to load settings.")
      );
    } finally {
      setLoadingSettings(false);
    }
  };

  const persistSection = async (
    section:
      | "profileAccount"
      | "workspaceProfile"
      | "aiDefaults"
      | "security"
      | "billing"
      | "activeSessions",
    data: unknown
  ) => {
    const response = await fetch(`/api/settings?workspaceId=${workspaceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, data })
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? tr("settings.saveFailed", "Failed to save settings."));
    }
  };

  useEffect(() => {
    setWorkspaceId(getSelectedWorkspaceId());
    const onWorkspaceChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ workspaceId?: string }>;
      setWorkspaceId(customEvent.detail?.workspaceId ?? getSelectedWorkspaceId());
    };
    window.addEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
    return () => window.removeEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
  }, []);

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const settingsSections = [
    { id: "llm", label: tr("settings.section.aiProvider", "AI Provider") },
    { id: "profile", label: tr("settings.section.profile", "Profile") },
    { id: "workspace", label: tr("settings.section.workspace", "Workspace") },
    { id: "language", label: tr("settings.section.languageTone", "Language & Tone") },
    { id: "security", label: tr("settings.section.security", "Security") },
    { id: "billing", label: tr("settings.section.billing", "Billing") }
  ];

  return (
    <div className="space-y-4">
      <section className="premium-page-hero">
        <p className="premium-page-kicker">{tr("page.settingsKicker", "Settings")}</p>
        <h1 className="premium-page-title">
          {tr("page.settingsTitle", "Workspace configuration and governance")}
        </h1>
        <p className="premium-page-description">
          {tr(
            "page.settingsDescription",
            "Manage business defaults, multilingual behavior, security controls, and billing."
          )}
        </p>
      </section>

      {!!toasts.length && (
        <div className="fixed right-5 top-20 z-[80] space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-xl border px-3 py-2 text-xs shadow-lg ${
                toast.type === "success"
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-error/40 bg-error/15 text-error"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="premium-panel h-fit p-3 xl:sticky xl:top-20">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {tr("settings.quickSections", "Quick sections")}
          </p>
          <div className="space-y-1">
            {settingsSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-lg border border-border/70 bg-elevated/25 px-2.5 py-2 text-xs text-secondary transition-colors hover:bg-elevated/60 hover:text-foreground"
              >
                {section.label}
              </a>
            ))}
          </div>
        </aside>

        <div className="grid gap-4 2xl:grid-cols-2">
          <article id="llm" className="2xl:col-span-2">
            <LlmProviderCard />
          </article>

          <article id="profile" className="premium-panel p-4">
          <h2 className="premium-section-title">{tr("settings.profileTitle", "Profile and Account")}</h2>
          <div className="mt-4 space-y-4">
            <Input placeholder={tr("settings.displayName", "Display name")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Input placeholder={tr("settings.role", "Role")} value={role} onChange={(e) => setRole(e.target.value)} />
            <Input placeholder={tr("settings.contactPhone", "Contact phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder={tr("settings.avatarUrl", "Profile image URL")} value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={!!saving.profile}
                onClick={() =>
                  void runSave(
                    "profile",
                    () => {
                      if (!displayName.trim()) return tr("settings.validation.displayNameRequired", "Display name is required.");
                      if (phone && !/^[+\d\s()-]{7,}$/.test(phone))
                        return tr("settings.validation.phoneInvalid", "Phone format looks invalid.");
                      return null;
                    },
                    async () => {
                      await persistSection("profileAccount", {
                        displayName,
                        role,
                        phone,
                        avatarUrl
                      });
                    }
                  )
                }
              >
                {saving.profile ? tr("common.saving", "Saving...") : tr("settings.updateProfile", "Update Profile")}
              </Button>
              <Button variant="outline" onClick={() => pushToast("success", tr("settings.notificationsOpened", "Notification preferences opened."))}>
                {tr("settings.manageNotifications", "Manage Notifications")}
              </Button>
            </div>
          </div>
          </article>

          <article id="workspace" className="premium-panel p-4">
          <h2 className="premium-section-title">{tr("settings.workspaceTitle", "Workspace Profile")}</h2>
          <div className="mt-4 space-y-4">
            <Input placeholder={tr("settings.workspaceName", "Workspace name")} value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} />
            <Input placeholder={tr("settings.industry", "Industry")} value={industry} onChange={(e) => setIndustry(e.target.value)} />
            <Textarea placeholder={tr("settings.businessDescription", "Business description")} value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button
              disabled={!!saving.workspace}
              onClick={() =>
                void runSave(
                  "workspace",
                  () => (!workspaceName.trim() ? tr("settings.validation.workspaceNameRequired", "Workspace name is required.") : null),
                  async () => {
                    await persistSection("workspaceProfile", {
                      workspaceName,
                      industry,
                      description
                    });
                  }
                )
              }
            >
              {saving.workspace ? tr("common.saving", "Saving...") : tr("settings.saveWorkspace", "Save Workspace")}
            </Button>
          </div>
          </article>

          <article id="language" className="premium-panel p-4">
          <h2 className="premium-section-title">{tr("settings.languageToneTitle", "Language and Tone Defaults")}</h2>
          <div className="mt-4 space-y-4">
            <Input value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} placeholder={tr("settings.defaultLanguage", "Default language")} />
            <Input value={secondaryLanguages} onChange={(e) => setSecondaryLanguages(e.target.value)} placeholder={tr("settings.secondaryLanguages", "Secondary languages")} />
            <Textarea value={toneDefaults} onChange={(e) => setToneDefaults(e.target.value)} placeholder={tr("settings.toneDefaults", "Tone defaults")} />
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent">{tr("settings.darijaEnabled", "Darija enabled")}</Badge>
              <Badge>{tr("settings.formalModeAvailable", "Formal mode available")}</Badge>
              <Badge>{tr("settings.translationShortcuts", "Translation shortcuts enabled")}</Badge>
            </div>
            <Button
              variant="secondary"
              disabled={!!saving.ai}
              onClick={() =>
                void runSave(
                  "ai",
                  () =>
                    (!defaultLanguage.trim()
                      ? tr("settings.validation.defaultLanguageRequired", "Default language is required.")
                      : null),
                  async () => {
                    await persistSection("aiDefaults", {
                      defaultLanguage,
                      secondaryLanguages,
                      toneDefaults
                    });
                  }
                )
              }
            >
              {saving.ai ? tr("common.saving", "Saving...") : tr("settings.updateAiDefaults", "Update AI Defaults")}
            </Button>
          </div>
          </article>

          <article id="security" className="premium-panel p-4">
          <h2 className="premium-section-title">{tr("settings.securityTitle", "Authentication and Security")}</h2>
          <div className="mt-4 space-y-4">
            <Input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder={tr("settings.loginEmail", "Login email")} />

            <div className="relative">
              <Input
                type={showCurrentPassword ? "text" : "password"}
                placeholder={tr("settings.currentPassword", "Current password")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder={tr("settings.newPassword", "New password")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                onClick={() => setShowNewPassword((prev) => !prev)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder={tr("settings.confirmPassword", "Confirm new password")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {securityError && <p className="text-xs text-error">{securityError}</p>}

            <Input value={mfaStatus} onChange={(e) => setMfaStatus(e.target.value)} placeholder={tr("settings.mfaStatus", "MFA status")} />

            <div className="premium-subpanel p-3 text-xs text-secondary">
              {tr("settings.activeSessions", "Active sessions")}: {activeSessions.join(" · ")}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={!!saving.security}
                onClick={() =>
                  void runSave(
                    "security",
                    () => {
                      setSecurityError("");
                      if (!/^\S+@\S+\.\S+$/.test(loginEmail)) {
                        const message = tr("settings.validation.loginEmailInvalid", "Login email is not valid.");
                        setSecurityError(message);
                        return message;
                      }
                      if (newPassword || confirmPassword) {
                        if (!currentPassword) {
                          const message = tr("settings.validation.currentPasswordRequired", "Current password is required.");
                          setSecurityError(message);
                          return message;
                        }
                        if (newPassword.length < 8) {
                          const message = tr("settings.validation.newPasswordMin", "New password must be at least 8 characters.");
                          setSecurityError(message);
                          return message;
                        }
                        if (newPassword !== confirmPassword) {
                          const message = tr("settings.validation.passwordConfirmMismatch", "Password confirmation does not match.");
                          setSecurityError(message);
                          return message;
                        }
                      }
                      return null;
                    },
                    async () => {
                      await persistSection("security", {
                        loginEmail,
                        mfaStatus
                      });
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }
                  )
                }
              >
                {saving.security ? tr("common.saving", "Saving...") : tr("settings.saveSecurityChanges", "Save Security Changes")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const nextSessions = activeSessions.slice(0, 1);
                  setActiveSessions(nextSessions);
                  void persistSection("activeSessions", nextSessions);
                  pushToast("success", tr("settings.otherSessionsSignedOut", "Other sessions signed out."));
                }}
              >
                {tr("settings.signOutOtherSessions", "Sign out other sessions")}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => pushToast("success", tr("settings.apiKeyRotationStarted", "API key rotation started."))}>
                {tr("settings.rotateApiKeys", "Rotate API Keys")}
              </Button>
              <Button variant="outline" onClick={() => pushToast("success", tr("settings.teamRolesOpened", "Team roles panel opened."))}>
                {tr("settings.manageTeamRoles", "Manage Team Roles")}
              </Button>
            </div>
          </div>
          </article>

          <article id="billing" className="premium-panel p-4">
          <h2 className="premium-section-title">{tr("settings.billingTitle", "Billing")}</h2>
          <div className="mt-4 space-y-4">
            <Input value={billingPlan} onChange={(e) => setBillingPlan(e.target.value)} placeholder={tr("settings.plan", "Plan")} />
            <Input value={billingUsage} onChange={(e) => setBillingUsage(e.target.value)} placeholder={tr("settings.usage", "Usage")} />
            <Input value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} placeholder={tr("settings.invoiceCycle", "Invoice cycle")} />
            <div className="flex gap-2">
              <Button
                disabled={!!saving.billing}
                onClick={() =>
                  void runSave("billing", undefined, async () => {
                    await persistSection("billing", {
                      plan: billingPlan,
                      usage: billingUsage,
                      invoiceCycle: billingCycle
                    });
                  })
                }
              >
                {saving.billing ? tr("common.saving", "Saving...") : tr("settings.upgradePlan", "Upgrade Plan")}
              </Button>
              <Button variant="outline" onClick={() => pushToast("success", tr("settings.invoiceDownloadStarted", "Invoice download started."))}>
                {tr("settings.downloadInvoice", "Download Invoice")}
              </Button>
            </div>
          </div>
          </article>
        </div>
      </section>

      {loadingSettings && (
        <div className="text-xs text-muted">{tr("settings.loading", "Loading settings...")}</div>
      )}
    </div>
  );
}
