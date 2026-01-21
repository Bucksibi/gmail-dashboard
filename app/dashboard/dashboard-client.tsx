"use client";

import {
  DashboardHeader,
  DashboardSidebar,
  WidgetContainer,
  KeyboardShortcutsModal,
} from "@/components/layout";
import { EmailList } from "@/components/email";
import { AIAssistantPanel } from "@/components/ai";
import { useUIStore, useAIStore } from "@/lib/stores";
import { useEffect } from "react";

interface DashboardClientProps {
  userEmail?: string;
  onSignOut?: () => void;
}

export function DashboardClient({ userEmail, onSignOut }: DashboardClientProps) {
  const { activeWidget, openShortcutsModal } = useUIStore();
  const { togglePanel: toggleAIPanel } = useAIStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        openShortcutsModal();
      }

      // Cmd/Ctrl + I to toggle AI panel
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        toggleAIPanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openShortcutsModal, toggleAIPanel]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <DashboardHeader userEmail={userEmail} onSignOut={onSignOut} />

      <div className="flex-1 flex overflow-hidden">
        <DashboardSidebar />

        <WidgetContainer>
          {activeWidget === "email" && <EmailList />}

          {activeWidget === "calendar" && (
            <ComingSoon title="Calendar" />
          )}

          {activeWidget === "tasks" && (
            <ComingSoon title="Tasks" />
          )}

          {activeWidget === "notes" && (
            <ComingSoon title="Notes" />
          )}
        </WidgetContainer>
      </div>

      <KeyboardShortcutsModal />
      <AIAssistantPanel />
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-primary-muted flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-foreground-muted max-w-sm">
        This widget is coming soon. Stay tuned for updates!
      </p>
    </div>
  );
}
