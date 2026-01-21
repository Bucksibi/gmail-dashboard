"use client";

import { ThemeToggle } from "@/components/theme";
import { Button } from "@/components/ui";
import { useUIStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  userEmail?: string;
  onSignOut?: () => void;
}

export function DashboardHeader({ userEmail, onSignOut }: DashboardHeaderProps) {
  const { sidebarExpanded, toggleSidebar, openShortcutsModal } = useUIStore();

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        {/* Menu toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            "text-foreground-muted hover:text-foreground",
            "hover:bg-surface-hover transition-colors duration-200",
            "focus-ring"
          )}
          aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg
            className="h-6 w-6 text-primary"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
          <span className="font-semibold text-foreground">Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Keyboard shortcuts */}
        <button
          onClick={openShortcutsModal}
          className={cn(
            "hidden sm:flex h-9 items-center gap-1.5 px-2 rounded-lg",
            "text-foreground-muted hover:text-foreground",
            "hover:bg-surface-hover transition-colors duration-200",
            "focus-ring text-sm"
          )}
          aria-label="Keyboard shortcuts"
        >
          <kbd className="px-1.5 py-0.5 bg-background-secondary rounded text-xs font-mono">
            ?
          </kbd>
          <span className="hidden md:inline">Shortcuts</span>
        </button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User menu */}
        {userEmail && (
          <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border">
            <span className="hidden sm:block text-sm text-foreground-muted truncate max-w-[180px]">
              {userEmail}
            </span>
            {onSignOut && (
              <Button variant="ghost" size="sm" onClick={onSignOut}>
                Sign out
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
