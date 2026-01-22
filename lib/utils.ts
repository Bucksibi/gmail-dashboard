import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#f43f5e", // rose
    "#f97316", // orange
    "#eab308", // yellow
    "#22c55e", // green
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#3b82f6", // blue
  ];

  return colors[Math.abs(hash) % colors.length];
}

export function getInitials(name: string): string {
  // Remove HTML tags, quotes, and special characters at the start
  const cleaned = name
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/^['"`]+/, "") // Remove leading quotes
    .replace(/['"`]+$/, "") // Remove trailing quotes
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  // Get first character, skipping any remaining special chars
  const getFirstAlpha = (str: string): string => {
    const match = str.match(/[a-zA-Z]/);
    return match ? match[0].toUpperCase() : str.charAt(0).toUpperCase();
  };

  if (parts.length === 1) return getFirstAlpha(parts[0]);

  return getFirstAlpha(parts[0]) + getFirstAlpha(parts[parts.length - 1]);
}

// Decode HTML entities in strings
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#160;': ' ',
  };

  return text.replace(/&[#\w]+;/g, (match) => entities[match] || match);
}

export function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

export function extractName(from: string): string {
  const match = from.match(/^([^<]+)/);
  return match ? match[1].trim().replace(/"/g, "") : from;
}
