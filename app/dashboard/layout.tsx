import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { authEnabled, getAuthenticatedUserFromCookies } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Dashboard - Sysnova AI"
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  if (authEnabled()) {
    const user = await getAuthenticatedUserFromCookies();
    if (!user) {
      redirect("/auth/login");
    }
  }
  return <DashboardShell>{children}</DashboardShell>;
}
