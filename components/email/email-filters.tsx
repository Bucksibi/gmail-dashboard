"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui";
import { useEmailStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

interface EmailFiltersProps {
  onRefresh: () => void;
}

export function EmailFilters({ onRefresh }: EmailFiltersProps) {
  const { filters, updateFilter, resetFilters } = useEmailStore();
  const [localSearch, setLocalSearch] = useState(filters.search);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const hasActiveFilters =
    filters.unreadOnly || filters.hasAttachment || filters.dateRange !== "all";

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
