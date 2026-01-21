"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center gap-2 font-medium",
          "rounded-lg transition-all duration-200",
          "focus-ring",
          "disabled:opacity-50 disabled:pointer-events-none",

          // Size variants
          {
            "h-8 px-3 text-sm": size === "sm",
            "h-9 px-4 text-sm": size === "md",
            "h-10 px-5 text-base": size === "lg",
          },

          // Color variants
          {
            "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm":
              variant === "primary",
            "bg-surface text-foreground border border-border hover:bg-surface-hover":
              variant === "secondary",
            "text-foreground-muted hover:text-foreground hover:bg-surface-hover":
              variant === "ghost",
            "bg-destructive text-white hover:bg-destructive/90 shadow-sm":
              variant === "destructive",
          },

          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
