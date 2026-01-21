"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface WidgetContainerProps {
  children: ReactNode;
  className?: string;
}

export function WidgetContainer({ children, className }: WidgetContainerProps) {
  return (
    <div className={cn("flex-1 overflow-hidden bg-background", className)}>
      {children}
    </div>
  );
}

interface WidgetHeaderProps {
  title: string;
  children?: ReactNode;
  className?: string;
}

export function WidgetHeader({ title, children, className }: WidgetHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border bg-surface",
        className
      )}
    >
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

interface WidgetBodyProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function WidgetBody({ children, className, noPadding }: WidgetBodyProps) {
  return (
    <div
      className={cn(
        "flex-1 overflow-auto",
        !noPadding && "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
