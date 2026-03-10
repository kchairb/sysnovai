"use client";

import {
  Bell,
  Check,
  ChevronDown,
  Loader2,
  Globe2,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Search,
  SlidersHorizontal,
  Sun
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useDashboardUi } from "@/components/layout/dashboard-ui-context";
import { useTheme } from "@/components/theme/theme-provider";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_WORKSPACE_ID,
  getSelectedWorkspaceId,
  setSelectedWorkspaceId,
  WORKSPACE_EVENT,
  workspaceOptions
} from "@/lib/client/workspace-selection";
import { type AppLocale } from "@/lib/i18n";

interface DashboardTopbarProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  mobileNavVisible?: boolean;
}

export function DashboardTopbar({
  onToggleSidebar,
  sidebarCollapsed,
  mobileNavVisible
}: DashboardTopbarProps) {
  const { tr, locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isWorkspaceRoute = pathname.startsWith("/dashboard/workspace");
  const { focusMode, setFocusMode } = useDashboardUi();
  const { theme, setTheme } = useTheme();
  const [showUtilities, setShowUtilities] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [accountName, setAccountName] = useState("Sysnova User");
  const [accountEmail, setAccountEmail] = useState("owner@sysnova.ai");
  const [workspaceName, setWorkspaceName] = useState("Sysnova Workspace");
  const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const quickSettingsRef = useRef<HTMLDivElement | null>(null);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);

  const hideUtilities = isWorkspaceRoute && focusMode && !showUtilities;
  const locales: AppLocale[] = ["en", "fr", "ar"];
  const localeLabels: Record<AppLocale, string> = {
    en: "English",
    fr: "Français",
    ar: "العربية"
  };

  const onSetLocale = (nextLocale: AppLocale) => {
    document.cookie = `sysnova_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    setShowQuickSettings(false);
    router.refresh();
  };

  const accountInitials = (() => {
    const source = accountName.trim() || accountEmail.trim() || "SA";
    const tokens = source.split(/\s+/).filter(Boolean);
    if (!tokens.length) return "SA";
    if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
    return `${tokens[0][0] ?? ""}${tokens[1][0] ?? ""}`.toUpperCase();
  })();

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setShowAccountMenu(false);
      }
      if (quickSettingsRef.current && !quickSettingsRef.current.contains(target)) {
        setShowQuickSettings(false);
      }
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(target)) {
        setShowWorkspaceMenu(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const current = getSelectedWorkspaceId();
    setWorkspaceId(current);
    const option = workspaceOptions.find((item) => item.id === current);
    if (option) {
      setWorkspaceName(option.name);
    }

    const onWorkspaceChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ workspaceId?: string }>;
      const nextWorkspaceId = customEvent.detail?.workspaceId ?? getSelectedWorkspaceId();
      setWorkspaceId(nextWorkspaceId);
      const nextOption = workspaceOptions.find((item) => item.id === nextWorkspaceId);
      if (nextOption) {
        setWorkspaceName(nextOption.name);
      }
    };
    window.addEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
    return () => window.removeEventListener(WORKSPACE_EVENT, onWorkspaceChange as EventListener);
  }, []);

  useEffect(() => {
    let active = true;

    const loadAccount = async () => {
      setLoadingAccount(true);
      try {
        const response = await fetch(`/api/auth/me?workspaceId=${workspaceId}`);
        if (!response.ok) {
          throw new Error("Failed to load account context.");
        }
        const payload = (await response.json()) as {
          user?: { name?: string | null; email?: string };
          workspace?: { name?: string };
        };
        if (!active) return;
        if (payload.user?.name?.trim()) {
          setAccountName(payload.user.name.trim());
        }
        if (payload.user?.email?.trim()) {
          setAccountEmail(payload.user.email.trim());
        }
        if (payload.workspace?.name?.trim()) {
          setWorkspaceName(payload.workspace.name.trim());
        }
      } catch {
        if (!active) return;
      } finally {
        if (active) {
          setLoadingAccount(false);
        }
      }
    };

    void loadAccount();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  return (
    <header
      className={`group relative z-40 isolate overflow-visible flex h-[64px] items-center justify-between gap-3 border-b border-border/70 px-4 backdrop-blur-xl md:px-5 ${
        theme === "dark"
          ? "bg-[linear-gradient(180deg,rgba(16,26,46,0.92),rgba(10,18,34,0.82))]"
          : "bg-[linear-gradient(180deg,rgba(247,250,255,0.94),rgba(239,245,255,0.88))]"
      }`}
      onMouseLeave={() => setShowNotifications(false)}
    >
      <button
        suppressHydrationWarning
        onClick={onToggleSidebar}
        className="premium-interactive grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-elevated/60 text-secondary transition-colors hover:text-foreground"
        title={tr("topbar.toggleSidebar", "Toggle sidebar")}
      >
        {mobileNavVisible === false || sidebarCollapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>
      <div
        className={`relative hidden w-full max-w-lg transition-all sm:block ${
          hideUtilities ? "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100" : "opacity-100"
        }`}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted" />
        <Input
          className="h-10 rounded-2xl border-border/80 bg-elevated/55 pl-9 text-[13px]"
          placeholder={tr("topbar.search", "Search conversations, products, knowledge...")}
        />
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={workspaceMenuRef}>
          <button
            type="button"
            className="premium-interactive hidden h-9 items-center gap-1 rounded-xl border border-border/80 bg-elevated/45 px-2.5 text-xs font-medium text-secondary transition-colors hover:text-foreground md:inline-flex"
            onClick={() => setShowWorkspaceMenu((prev) => !prev)}
            title={tr("topbar.switchWorkspace", "Switch workspace")}
          >
            {workspaceName}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div
            className={`absolute right-0 top-full z-[80] mt-2 w-60 origin-top-right rounded-xl border border-border/80 bg-surface/95 p-1.5 shadow-glow transition-all duration-180 ${
              showWorkspaceMenu
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-95 opacity-0"
            }`}
            aria-hidden={!showWorkspaceMenu}
          >
            {workspaceOptions.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                  workspace.id === workspaceId
                    ? "bg-accent/15 text-foreground"
                    : "text-secondary hover:bg-elevated/60 hover:text-foreground"
                }`}
                onClick={() => {
                  setSelectedWorkspaceId(workspace.id);
                  setShowWorkspaceMenu(false);
                  router.refresh();
                }}
              >
                {workspace.name}
                {workspace.id === workspaceId && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>

        <div className="relative" ref={quickSettingsRef}>
          <button
            type="button"
            className="premium-interactive grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-elevated/60 text-secondary transition-colors hover:text-foreground"
            onClick={() => {
              setShowUtilities(true);
              setShowQuickSettings((prev) => !prev);
            }}
            title={tr("topbar.quickSettings", "Quick settings")}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <div
            className={`absolute right-0 top-full z-[80] mt-2 w-64 origin-top-right rounded-xl border border-border/80 bg-surface/95 p-2 shadow-glow transition-all duration-180 ${
              showQuickSettings
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-95 opacity-0"
            }`}
            aria-hidden={!showQuickSettings}
          >
              <button
                type="button"
                className="w-full rounded-lg border border-border/70 bg-elevated/40 px-3 py-2 text-left text-xs font-medium text-secondary transition-colors hover:bg-elevated/70 hover:text-foreground"
                onClick={() => {
                  setShowQuickSettings(false);
                  router.push("/dashboard/settings");
                }}
              >
                {tr("topbar.openSettings", "Open settings page")}
              </button>
              <div className="mt-2 rounded-lg border border-border/70 bg-elevated/25 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {tr("common.language", "Language")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {locales.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onSetLocale(item)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
                        item === locale
                          ? "border-accent/40 bg-accent/15 text-foreground"
                          : "border-border/70 bg-elevated/35 text-secondary hover:text-foreground"
                      }`}
                    >
                      {item === locale && <Check className="h-3 w-3" />}
                      {localeLabels[item]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 rounded-lg border border-border/70 bg-elevated/25 p-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {tr("topbar.theme", "Theme")}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
                      theme === "dark"
                        ? "border-accent/40 bg-accent/15 text-foreground"
                        : "border-border/70 bg-elevated/35 text-secondary hover:text-foreground"
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-3 w-3" />
                    {theme === "dark" && <Check className="h-3 w-3" />}
                    {tr("topbar.dark", "Dark")}
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
                      theme === "light"
                        ? "border-accent/40 bg-accent/15 text-foreground"
                        : "border-border/70 bg-elevated/35 text-secondary hover:text-foreground"
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-3 w-3" />
                    {theme === "light" && <Check className="h-3 w-3" />}
                    {tr("topbar.light", "Light")}
                  </button>
                </div>
              </div>
              <button
                type="button"
                className={`mt-2 w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  focusMode
                    ? "border-accent/35 bg-accent/15 text-foreground"
                    : "border-border/70 bg-elevated/25 text-secondary hover:text-foreground"
                }`}
                onClick={() => setFocusMode(!focusMode)}
              >
                {focusMode
                  ? tr("topbar.disableFocusMode", "Disable focus mode")
                  : tr("topbar.enableFocusMode", "Enable focus mode")}
              </button>
          </div>
        </div>
        <button
          type="button"
          className={`premium-interactive h-8 rounded-xl border border-border/80 px-2.5 text-xs ${
            focusMode ? "bg-accent/15 text-foreground" : "bg-elevated/50 text-secondary"
          }`}
          onClick={() => setFocusMode(!focusMode)}
        >
          {tr("topbar.focus", "Focus")}
        </button>
        <div
          className={`flex items-center gap-2 transition-all ${
            hideUtilities ? "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100" : "opacity-100"
          }`}
        >
          <div className="relative" ref={notificationsRef}>
            <button
              suppressHydrationWarning
              className="premium-interactive grid h-9 w-9 place-items-center rounded-xl border border-border/80 bg-elevated/60 text-secondary transition-colors hover:text-foreground"
              onClick={() => setShowNotifications((prev) => !prev)}
              type="button"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div
              className={`absolute right-0 top-full z-[80] mt-2 w-72 origin-top-right rounded-xl border border-border/80 bg-surface/95 p-2 shadow-glow transition-all duration-180 ${
                showNotifications
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-1 scale-95 opacity-0"
              }`}
              aria-hidden={!showNotifications}
            >
              <p className="px-2 py-1 text-xs font-medium text-secondary">
                {tr("topbar.notifications", "Notifications")}
              </p>
              <div className="space-y-1">
                <div className="rounded-lg border border-border/70 bg-elevated/35 p-2 text-xs text-secondary">
                  New reply generated for Collection Prestige.
                </div>
                <div className="rounded-lg border border-border/70 bg-elevated/35 p-2 text-xs text-secondary">
                  API usage reached 74% of daily quota.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative" ref={accountRef}>
          <button
            type="button"
            className="premium-interactive flex h-9 items-center gap-1 rounded-xl border border-accent/40 bg-accent/15 px-2 text-xs font-semibold text-accent"
            onClick={() => setShowAccountMenu((prev) => !prev)}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[linear-gradient(135deg,rgba(34,199,214,0.24),rgba(94,110,255,0.24))] text-[10px] font-bold text-foreground">
              {accountInitials}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div
            className={`absolute right-0 top-full z-[80] mt-2 w-44 origin-top-right rounded-xl border border-border/80 bg-surface/95 p-1.5 shadow-glow transition-all duration-180 ${
              showAccountMenu
                ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-95 opacity-0"
            }`}
            aria-hidden={!showAccountMenu}
          >
            <div className="mb-1 rounded-lg border border-border/70 bg-elevated/30 px-2.5 py-2">
              <p className="truncate text-xs font-semibold text-foreground">{accountName}</p>
              <p className="truncate text-[11px] text-secondary">{accountEmail}</p>
              <p className="mt-1 truncate text-[11px] text-muted">{workspaceName}</p>
            </div>
            <button
              className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-secondary hover:bg-elevated/60 hover:text-foreground"
              onClick={() => {
                setShowAccountMenu(false);
                router.push("/dashboard/settings");
              }}
            >
                  {tr("topbar.profile", "Profile")}
            </button>
            <button
              className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-secondary hover:bg-elevated/60 hover:text-foreground"
              onClick={() => {
                setShowAccountMenu(false);
                router.push("/dashboard/settings");
              }}
            >
                  {tr("nav.settings", "Settings")}
            </button>
            <button
              className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-error hover:bg-error/10"
              onClick={async () => {
                setShowAccountMenu(false);
                await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
                router.push("/auth/login");
                router.refresh();
              }}
            >
                  {tr("topbar.signOut", "Sign out")}
            </button>
          </div>
        </div>
        {loadingAccount && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
      </div>
    </header>
  );
}
