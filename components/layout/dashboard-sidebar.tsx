"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { sidebarItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { Logo } from "@/components/layout/logo";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";

const labelsByHref: Record<string, string> = {
  "/dashboard": "nav.home",
  "/dashboard/workspace": "nav.workspace",
  "/dashboard/knowledge": "nav.knowledge",
  "/dashboard/products": "nav.products",
  "/dashboard/marketing": "nav.marketing",
  "/dashboard/api": "nav.api",
  "/dashboard/tunisian-ai": "nav.tunisian",
  "/dashboard/admin": "nav.admin",
  "/dashboard/settings": "nav.settings"
};

export function DashboardSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { tr } = useLocale();
  const { theme } = useTheme();

  return (
    <aside
      className={cn(
        "hidden flex-col border-r border-border/80 p-3 transition-all duration-200 lg:flex",
        theme === "dark"
          ? "bg-[linear-gradient(180deg,rgba(16,24,42,0.98),rgba(6,12,24,0.99))]"
          : "bg-[linear-gradient(180deg,rgba(250,253,255,0.98),rgba(241,246,255,0.99))]",
        collapsed ? "w-[78px]" : "w-[244px]"
      )}
    >
      <Logo className="px-2 py-1" compact={collapsed} />
      <Button
        className={cn(
          "mt-6 premium-interactive",
          collapsed ? "w-full justify-center px-0" : "w-full justify-start"
        )}
        variant="secondary"
      >
        <Plus className={cn("h-4 w-4", !collapsed && "mr-2")} />
        {!collapsed && tr("common.newChat", "New Workspace Chat")}
      </Button>
      <nav className="mt-5 space-y-1.5">
        {sidebarItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const label = tr(labelsByHref[item.href] ?? "", item.label);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-xl py-2.5 text-[13px] font-medium text-secondary transition-colors duration-200",
                "premium-interactive",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "border border-accent/30 bg-gradient-to-r from-accent/14 to-elevated/80 text-foreground shadow-[0_8px_24px_rgba(9,17,34,0.42)]"
                  : "hover:bg-elevated/70 hover:text-foreground"
              )}
            >
              <item.icon className="h-[15px] w-[15px]" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>
      <div
        className={cn(
          "mt-auto rounded-2xl border border-border/80 bg-elevated/35",
          collapsed ? "p-2 text-center" : "p-3"
        )}
      >
        <p className="text-xs text-muted">Plan</p>
        {!collapsed && (
          <>
            <p className="mt-1 text-sm font-medium">Growth Workspace</p>
            <p className="mt-1 text-xs text-secondary">128 products · 89k API calls</p>
          </>
        )}
      </div>
    </aside>
  );
}
