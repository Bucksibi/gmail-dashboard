"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["j", "↓"], description: "Move to next email" },
      { keys: ["k", "↑"], description: "Move to previous email" },
      { keys: ["Enter", "o"], description: "Open selected email" },
      { keys: ["Escape"], description: "Close email / Clear selection" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: ["/"], description: "Focus search" },
      { keys: ["r"], description: "Refresh emails" },
      { keys: ["x"], description: "Select / Deselect email" },
      { keys: ["⌘", "a"], description: "Select all emails" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["?"], description: "Show keyboard shortcuts" },
      { keys: ["["], description: "Toggle sidebar" },
    ],
  },
];

export function KeyboardShortcutsModal() {
  const { shortcutsModalOpen, closeShortcutsModal } = useUIStore();

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && shortcutsModalOpen) {
        closeShortcutsModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutsModalOpen, closeShortcutsModal]);

  if (!shortcutsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fadeIn"
        onClick={closeShortcutsModal}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative bg-surface rounded-xl shadow-xl",
          "w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden",
          "animate-fadeIn"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={closeShortcutsModal}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-foreground-muted hover:text-foreground",
              "hover:bg-surface-hover transition-colors duration-200",
              "focus-ring"
            )}
            aria-label="Close"
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
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="space-y-6">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-medium text-foreground-muted mb-3">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm text-foreground">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center">
                            {keyIdx > 0 && (
                              <span className="text-foreground-muted text-xs mx-1">
                                or
                              </span>
                            )}
                            <kbd
                              className={cn(
                                "inline-flex items-center justify-center",
                                "min-w-[24px] h-6 px-1.5",
                                "bg-background-secondary border border-border rounded",
                                "text-xs font-mono text-foreground"
                              )}
                            >
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
