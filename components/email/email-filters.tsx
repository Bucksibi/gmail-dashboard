"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui";
import { useEmailStore } from "@/lib/stores";
import { cn } from "@/lib/utils";
import { CategoryChip, CLASSIFICATION_CATEGORIES } from "./classification-badge";

interface EmailFiltersProps {
  onRefresh: () => void;
}

export function EmailFilters({ onRefresh }: EmailFiltersProps) {
  const { filters, updateFilter, resetFilters, classifications, isClassifying } = useEmailStore();
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilter("search", localSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, updateFilter]);

  // Sync local search with store
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Focus search on "/" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    if (!showCategoryFilter) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCategoryFilter(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCategoryFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showCategoryFilter]);

  const hasActiveFilters =
    filters.unreadOnly ||
    filters.hasAttachment ||
    filters.dateRange !== "all" ||
    filters.categories.length > 0 ||
    filters.priorities.length > 0 ||
    filters.excludeRedundant;

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    updateFilter("categories", newCategories);
  };

  const togglePriority = (priority: "high" | "medium" | "low") => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter((p) => p !== priority)
      : [...filters.priorities, priority];
    updateFilter("priorities", newPriorities);
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-b border-border bg-surface">
      {/* Search bar */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search emails..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className={cn(
            "w-full h-9 pl-9 pr-3 rounded-lg",
            "bg-background-secondary border border-transparent",
            "text-sm text-foreground placeholder:text-foreground-muted",
            "focus:outline-none focus:border-primary focus:bg-surface",
            "transition-colors duration-200"
          )}
        />
        {localSearch && (
          <button
            onClick={() => setLocalSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-foreground-muted hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterToggle
          active={filters.unreadOnly}
          onClick={() => updateFilter("unreadOnly", !filters.unreadOnly)}
        >
          Unread
        </FilterToggle>

        <FilterToggle
          active={filters.hasAttachment}
          onClick={() => updateFilter("hasAttachment", !filters.hasAttachment)}
        >
          Has attachment
        </FilterToggle>

        <DateRangeSelect
          value={filters.dateRange}
          onChange={(value) => updateFilter("dateRange", value)}
        />

        {/* Category filter dropdown */}
        <div className="relative" ref={dropdownRef}>
          <FilterToggle
            active={filters.categories.length > 0}
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
          >
            <span className="flex items-center gap-1">
              Category
              {filters.categories.length > 0 && (
                <span className="text-[10px] bg-white/20 px-1 rounded">
                  {filters.categories.length}
                </span>
              )}
              <svg
                className={cn(
                  "h-3 w-3 transition-transform",
                  showCategoryFilter && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </span>
          </FilterToggle>

          {showCategoryFilter && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-surface border border-border rounded-lg shadow-lg p-2 min-w-[200px]">
              <div className="text-xs text-foreground-muted mb-2 px-1">Filter by category</div>
              <div className="flex flex-wrap gap-1.5">
                {CLASSIFICATION_CATEGORIES.map((cat) => (
                  <CategoryChip
                    key={cat}
                    category={cat}
                    selected={filters.categories.includes(cat)}
                    onClick={() => toggleCategory(cat)}
                  />
                ))}
              </div>
              <div className="border-t border-border mt-2 pt-2">
                <div className="text-xs text-foreground-muted mb-2 px-1">Filter by priority</div>
                <div className="flex gap-1.5">
                  <PriorityToggle
                    priority="high"
                    selected={filters.priorities.includes("high")}
                    onClick={() => togglePriority("high")}
                  />
                  <PriorityToggle
                    priority="medium"
                    selected={filters.priorities.includes("medium")}
                    onClick={() => togglePriority("medium")}
                  />
                  <PriorityToggle
                    priority="low"
                    selected={filters.priorities.includes("low")}
                    onClick={() => togglePriority("low")}
                  />
                </div>
              </div>
              <div className="border-t border-border mt-2 pt-2">
                <label className="flex items-center gap-2 px-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.excludeRedundant}
                    onChange={() => updateFilter("excludeRedundant", !filters.excludeRedundant)}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  <span className="text-xs text-foreground">Hide redundant</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Classification loading indicator */}
        {isClassifying && (
          <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
            <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Classifying...</span>
          </div>
        )}

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-primary hover:text-primary-hover ml-auto"
          >
            Clear filters
          </button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="ml-auto"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
    </div>
  );
}

function FilterToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-7 px-2.5 rounded-full text-xs font-medium",
        "transition-colors duration-200",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-background-secondary text-foreground-muted hover:text-foreground hover:bg-background-tertiary"
      )}
    >
      {children}
    </button>
  );
}

function DateRangeSelect({
  value,
  onChange,
}: {
  value: "all" | "today" | "week" | "month";
  onChange: (value: "all" | "today" | "week" | "month") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as typeof value)}
      className={cn(
        "h-7 px-2.5 rounded-full text-xs font-medium",
        "bg-background-secondary text-foreground-muted",
        "border-0 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        value !== "all" && "bg-primary text-primary-foreground"
      )}
    >
      <option value="all">Any time</option>
      <option value="today">Today</option>
      <option value="week">Past week</option>
      <option value="month">Past month</option>
    </select>
  );
}

function PriorityToggle({
  priority,
  selected,
  onClick,
}: {
  priority: "high" | "medium" | "low";
  selected: boolean;
  onClick: () => void;
}) {
  const config = {
    high: {
      label: "High",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/10",
      dot: "bg-red-500",
    },
    medium: {
      label: "Medium",
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-500/10",
      dot: "bg-yellow-500",
    },
    low: {
      label: "Low",
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-500/10",
      dot: "bg-gray-400",
    },
  }[priority];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        "transition-all duration-200",
        selected
          ? cn(config.bgColor, config.color, "ring-1 ring-current/30")
          : "bg-background-secondary text-foreground-muted hover:bg-background-tertiary"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </button>
  );
}
