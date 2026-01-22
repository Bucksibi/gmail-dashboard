"use client";

import { cn } from "@/lib/utils";
import type { EmailClassification } from "@/lib/stores";

interface ClassificationBadgeProps {
  classification: EmailClassification | undefined;
  showPriority?: boolean;
  showCategory?: boolean;
  compact?: boolean;
}

// Category config with colors and icons - optimized for B2B/HVAC business emails
const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  orders: {
    label: "Order",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  alerts: {
    label: "Alert",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
  },
  vendors: {
    label: "Vendor",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  customers: {
    label: "Customer",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
  },
  correspondence: {
    label: "Reply Needed",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  billing: {
    label: "Billing",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  shipping: {
    label: "Shipping",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  system: {
    label: "System",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-500/10",
  },
  other: {
    label: "Other",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-500/10",
  },
};

// Priority indicators
const PRIORITY_CONFIG = {
  high: {
    indicator: "bg-red-500",
    label: "High priority",
  },
  medium: {
    indicator: "bg-yellow-500",
    label: "Medium priority",
  },
  low: {
    indicator: "bg-gray-400",
    label: "Low priority",
  },
};

export function ClassificationBadge({
  classification,
  showPriority = true,
  showCategory = true,
  compact = false,
}: ClassificationBadgeProps) {
  if (!classification) return null;

  const categoryConfig =
    CATEGORY_CONFIG[classification.category] || CATEGORY_CONFIG.other;
  const priorityConfig = PRIORITY_CONFIG[classification.priority];

  return (
    <div className="flex items-center gap-1.5">
      {/* Priority indicator dot */}
      {showPriority && (
        <span
          className={cn(
            "shrink-0 rounded-full",
            compact ? "h-1.5 w-1.5" : "h-2 w-2",
            priorityConfig.indicator
          )}
          title={priorityConfig.label}
        />
      )}

      {/* Category badge */}
      {showCategory && (
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 font-medium",
            compact ? "text-[10px]" : "text-xs",
            categoryConfig.color,
            categoryConfig.bgColor
          )}
        >
          {categoryConfig.label}
        </span>
      )}

      {/* Redundant indicator */}
      {classification.isRedundant && (
        <span
          className={cn(
            "shrink-0 text-foreground-muted",
            compact ? "text-[10px]" : "text-xs"
          )}
          title="Redundant/duplicate email"
        >
          <svg
            className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
            />
          </svg>
        </span>
      )}
    </div>
  );
}

// Standalone priority indicator component
export function PriorityIndicator({
  priority,
  size = "sm",
}: {
  priority: "high" | "medium" | "low";
  size?: "sm" | "md";
}) {
  const config = PRIORITY_CONFIG[priority];
  const sizeClasses = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <span
      className={cn("rounded-full", sizeClasses, config.indicator)}
      title={config.label}
    />
  );
}

// Category filter chip component
export function CategoryChip({
  category,
  selected,
  onClick,
  count,
}: {
  category: string;
  selected: boolean;
  onClick: () => void;
  count?: number;
}) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        "transition-all duration-200",
        selected
          ? cn(config.bgColor, config.color, "ring-1 ring-current/30")
          : "bg-background-secondary text-foreground-muted hover:bg-background-tertiary"
      )}
    >
      {config.label}
      {count !== undefined && (
        <span className="opacity-60">({count})</span>
      )}
    </button>
  );
}

// Available categories for filtering
export const CLASSIFICATION_CATEGORIES = Object.keys(CATEGORY_CONFIG);
