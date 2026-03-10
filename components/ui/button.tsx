import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[13px] font-semibold tracking-[-0.01em] transition-all duration-200 hover:-translate-y-px active:translate-y-0 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-background shadow-[0_8px_26px_rgba(18,191,225,0.35)] hover:bg-accent-hover hover:shadow-[0_10px_32px_rgba(18,191,225,0.45)]",
        secondary:
          "border border-border bg-elevated/70 text-foreground hover:bg-elevated/95",
        ghost: "text-secondary hover:bg-elevated/70 hover:text-foreground",
        outline:
          "border border-border bg-transparent text-secondary hover:bg-elevated/80 hover:text-foreground"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-[12px]",
        lg: "h-11 px-6 text-[14px]",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        suppressHydrationWarning
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
