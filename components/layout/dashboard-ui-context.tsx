"use client";

import { createContext, useContext } from "react";

type DashboardUiContextValue = {
  zenMode: boolean;
  setZenMode: (value: boolean) => void;
  focusMode: boolean;
  setFocusMode: (value: boolean) => void;
};

const DashboardUiContext = createContext<DashboardUiContextValue | null>(null);

export function DashboardUiProvider({
  value,
  children
}: {
  value: DashboardUiContextValue;
  children: React.ReactNode;
}) {
  return <DashboardUiContext.Provider value={value}>{children}</DashboardUiContext.Provider>;
}

export function useDashboardUi() {
  const context = useContext(DashboardUiContext);
  if (!context) {
    throw new Error("useDashboardUi must be used within DashboardUiProvider");
  }
  return context;
}
