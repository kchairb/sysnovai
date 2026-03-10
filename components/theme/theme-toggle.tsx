"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-8 px-2.5"
      onClick={toggleTheme}
      title="Toggle dark/light mode"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="text-[11px]">{theme === "dark" ? "Light" : "Dark"}</span>
    </Button>
  );
}
