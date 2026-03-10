import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.01em] [&_svg]:h-3.5 [&_svg]:w-3.5",
  {
    variants: {
      variant: {
        default: "border-border bg-elevated/65 text-secondary",
        accent: "border-accent/35 bg-accent/15 text-accent",
        success: "border-success/35 bg-success/15 text-success"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  className?: string;
  children: React.ReactNode;
}

export function Badge({ className, variant, children }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>;
}
