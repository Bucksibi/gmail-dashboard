"use client";

import { cn, hashStringToColor, getInitials } from "@/lib/utils";

export interface AvatarProps {
  name: string;
  email?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name, email, size = "md", className }: AvatarProps) {
  const initials = getInitials(name);
  const colorSource = email || name;
  const backgroundColor = hashStringToColor(colorSource);

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-medium text-white shrink-0",
        "transition-transform duration-200",
        {
          "h-8 w-8 text-xs": size === "sm",
          "h-10 w-10 text-sm": size === "md",
          "h-12 w-12 text-base": size === "lg",
        },
        className
      )}
      style={{ backgroundColor }}
      aria-label={`Avatar for ${name}`}
    >
      {initials}
    </div>
  );
}
