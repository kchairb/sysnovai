import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  compact?: boolean;
  className?: string;
}

export function Logo({ compact, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/40">
        <Sparkles className="h-4 w-4" />
      </div>
      {!compact && (
        <div>
          <p className="text-sm font-semibold tracking-wide text-foreground">Sysnova AI</p>
          <p className="text-xs text-muted">Business + Tunisian Intelligence</p>
        </div>
      )}
    </div>
  );
}
