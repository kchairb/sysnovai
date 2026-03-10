"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function DashboardMobileNav({ visible = true }: { visible?: boolean }) {
  const pathname = usePathname();
  if (!visible) return null;

  return (
    <nav className="border-b border-border/80 bg-surface/70 px-4 py-2 backdrop-blur-xl lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sidebarItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-xl border px-3 py-1.5 text-[12px] font-medium",
                "premium-interactive",
                isActive
                  ? "border-accent/50 bg-accent/15 text-foreground"
                  : "border-border bg-elevated/40 text-secondary"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
