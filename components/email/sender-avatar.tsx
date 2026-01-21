"use client";

import { Avatar } from "@/components/ui";
import { extractName, extractEmail } from "@/lib/utils";

interface SenderAvatarProps {
  from: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SenderAvatar({ from, size = "md", className }: SenderAvatarProps) {
  const name = extractName(from);
  const email = extractEmail(from);

  return <Avatar name={name} email={email} size={size} className={className} />;
}
