"use client";

import { createContext, useContext } from "react";
import { type AppLocale, defaultLocale, t } from "@/lib/i18n";

type LocaleContextValue = {
  locale: AppLocale;
  tr: (key: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  tr: (key, fallback) => fallback ?? key
});

export function LocaleProvider({
  locale,
  children
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider
      value={{
        locale,
        tr: (key, fallback) => t(locale, key, fallback)
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
