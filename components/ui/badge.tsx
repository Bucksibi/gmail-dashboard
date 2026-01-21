"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "destructive" | "unread";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-full",
        "transition-colors duration-200",

        // Size
        {
          "h-5 min-w-5 px-1.5 text-xs": size === "sm",
          "h-6 min-w-6 px-2 text-sm": size === "md",
        },

        // Variants
        {
          "bg-background-tertiary text-foreground-muted": variant === "default",
          "bg-primary-muted text-primary": variant === "primary",
          "bg-success-muted text-success": variant === "success",
          "bg-warning-muted text-warning": variant === "warning",
          "bg-destructive-muted text-destructive": variant === "destructive",
          "bg-email-unread text-white": variant === "unread",
        },

        className
      )}
    >
      {children}
    </span>
  );
}

// Dot badge for unread indicator
export function DotBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full bg-email-unread",
        className
      )}
    />
  );
}
