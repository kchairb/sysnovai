"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DashboardUiProvider } from "@/components/layout/dashboard-ui-context";
import { DashboardMobileNav } from "@/components/layout/dashboard-mobile-nav";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { useTheme } from "@/components/theme/theme-provider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWorkspaceRoute = pathname.startsWith("/dashboard/workspace");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isWorkspaceRoute);
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [focusMode, setFocusMode] = useState(isWorkspaceRoute);
  const { theme } = useTheme();

  useEffect(() => {
    setSidebarCollapsed(isWorkspaceRoute);
    setFocusMode(isWorkspaceRoute);
  }, [isWorkspaceRoute]);

  const onToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileNavVisible((prev) => !prev);
      return;
    }
    setSidebarCollapsed((prev) => !prev);
  };

  const hideChrome = zenMode && isWorkspaceRoute;

  return (
    <DashboardUiProvider value={{ zenMode, setZenMode, focusMode, setFocusMode }}>
      <div
        className={`min-h-screen bg-background ${
          theme === "dark"
            ? "bg-[radial-gradient(circle_at_0%_0%,rgba(34,199,214,0.12),transparent_26%),radial-gradient(circle_at_100%_0%,rgba(67,86,255,0.16),transparent_28%)]"
            : "bg-[radial-gradient(circle_at_0%_0%,rgba(34,199,214,0.1),transparent_32%),radial-gradient(circle_at_100%_0%,rgba(67,86,255,0.1),transparent_34%)]"
        }`}
      >
        <div className="flex min-h-screen w-full">
          {!hideChrome && <DashboardSidebar collapsed={sidebarCollapsed} />}
          <div className="flex min-w-0 flex-1 flex-col">
            {!hideChrome && (
              <DashboardTopbar
                onToggleSidebar={onToggleSidebar}
                sidebarCollapsed={sidebarCollapsed}
                mobileNavVisible={mobileNavVisible}
              />
            )}
            {!hideChrome && <DashboardMobileNav visible={mobileNavVisible} />}
            <main className={hideChrome ? "flex-1 p-2 md:p-3" : "flex-1 p-4 md:p-5"}>
              {children}
            </main>
          </div>
        </div>
      </div>
    </DashboardUiProvider>
  );
}
