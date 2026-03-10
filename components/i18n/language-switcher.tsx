"use client";

import { Globe2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/locale-provider";
import { type AppLocale } from "@/lib/i18n";

const locales: AppLocale[] = ["en", "fr", "ar"];
const labels: Record<AppLocale, string> = { en: "English", fr: "Français", ar: "العربية" };

export function LanguageSwitcher() {
  const { locale } = useLocale();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const onSetLocale = (nextLocale: AppLocale) => {
    document.cookie = `sysnova_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    setIsOpen(false);
    startTransition(() => {
      router.refresh();
    });
  };

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 px-2.5"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Globe2 className="h-4 w-4" />
        <span className="text-[11px]">{labels[locale]}</span>
      </Button>
      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-40 rounded-xl border border-border/80 bg-surface/95 p-1.5 shadow-glow">
          {locales.map((item) => (
            <button
              key={item}
              type="button"
              className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                item === locale
                  ? "bg-accent/15 text-foreground"
                  : "text-secondary hover:bg-elevated/70 hover:text-foreground"
              }`}
              onClick={() => onSetLocale(item)}
              disabled={isPending}
            >
              {labels[item]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
