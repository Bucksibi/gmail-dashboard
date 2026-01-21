"use client";

import { useEffect, useCallback, useRef } from "react";
import { EmailListItem } from "./email-list-item";
import { EmailFilters } from "./email-filters";
import { EmailDetail } from "./email-detail";
import { EmailListSkeleton, Button } from "@/components/ui";
import { useEmailStore, useUIStore, type EmailFilters as Filters } from "@/lib/stores";
import { cn } from "@/lib/utils";

export function EmailList() {
  const {
    emails,
    selectedEmailId,
    selectedEmailIds,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    pageToken,
    filters,
    setEmails,
    appendEmails,
    selectEmail,
    toggleEmailSelection,
    selectAllEmails,
    clearSelection,
    setLoading,
    setLoadingMore,
    setError,
    setPageToken,
  } = useEmailStore();

  const { detailPanelOpen, openDetailPanel, closeDetailPanel, toggleSidebar } = useUIStore();
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef<number>(-1);

  // Build Gmail query from filters
  const buildQuery = useCallback((f: Filters): string => {
    const parts: string[] = [];

    if (f.search) {
      parts.push(f.search);
    }
    if (f.unreadOnly) {
      parts.push("is:unread");
    }
    if (f.hasAttachment) {
      parts.push("has:attachment");
    }
    if (f.dateRange !== "all") {
      const now = new Date();
      let afterDate: Date;
      switch (f.dateRange) {
        case "today":
          afterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week":
          afterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          afterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      parts.push(`after:${afterDate.toISOString().split("T")[0]}`);
    }

    return parts.join(" ");
  }, []);

  // Fetch emails
  const fetchEmails = useCallback(
    async (append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams();
        const query = buildQuery(filters);
        if (query) params.set("q", query);
        if (append && pageToken) params.set("pageToken", pageToken);

        const response = await fetch(`/api/gmail/messages?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch emails");
        }

        if (append) {
          appendEmails(data.messages || [], data.nextPageToken);
        } else {
          setEmails(data.messages || []);
          setPageToken(data.nextPageToken);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      filters,
      pageToken,
      buildQuery,
      setEmails,
      appendEmails,
      setLoading,
      setLoadingMore,
      setError,
      setPageToken,
    ]
  );

  // Initial fetch and filter changes
  useEffect(() => {
    fetchEmails();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const currentIndex = emails.findIndex((e) => e.id === selectedEmailId);

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          if (currentIndex < emails.length - 1) {
            selectEmail(emails[currentIndex + 1].id);
            selectedIndexRef.current = currentIndex + 1;
          } else if (currentIndex === -1 && emails.length > 0) {
            selectEmail(emails[0].id);
            selectedIndexRef.current = 0;
          }
          break;

        case "k":
        case "ArrowUp":
          e.preventDefault();
          if (currentIndex > 0) {
            selectEmail(emails[currentIndex - 1].id);
            selectedIndexRef.current = currentIndex - 1;
          }
          break;

        case "Enter":
        case "o":
          if (selectedEmailId) {
            openDetailPanel();
          }
          break;

        case "Escape":
          if (detailPanelOpen) {
            closeDetailPanel();
          } else if (selectedEmailIds.size > 0) {
            clearSelection();
          } else {
            selectEmail(null);
          }
          break;

        case "x":
          if (selectedEmailId) {
            toggleEmailSelection(selectedEmailId);
          }
          break;

        case "a":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            selectAllEmails();
          }
          break;

        case "r":
          if (!e.metaKey && !e.ctrlKey) {
            fetchEmails();
          }
          break;

        case "[":
          toggleSidebar();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    emails,
    selectedEmailId,
    selectedEmailIds,
    detailPanelOpen,
    selectEmail,
    toggleEmailSelection,
    selectAllEmails,
    clearSelection,
    openDetailPanel,
    closeDetailPanel,
    toggleSidebar,
    fetchEmails,
  ]);

  // Scroll selected email into view
  useEffect(() => {
    if (selectedEmailId && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-email-id="${selectedEmailId}"]`
      );
      selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedEmailId]);

  const handleEmailSelect = useCallback(
    (id: string) => {
      selectEmail(id);
    },
    [selectEmail]
  );

  const handleEmailOpen = useCallback(
    (id: string) => {
      selectEmail(id);
      openDetailPanel();
    },
    [selectEmail, openDetailPanel]
  );

  const handleToggleSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      toggleEmailSelection(id);
    },
    [toggleEmailSelection]
  );

  return (
    <div className="flex h-full">
      {/* Email list section */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 h-full",
          detailPanelOpen && "hidden lg:flex"
        )}
      >
        <EmailFilters onRefresh={() => fetchEmails()} />

        <div ref={listRef} className="flex-1 overflow-y-auto">
          {isLoading && <EmailListSkeleton count={8} />}

          {error && (
            <div className="p-4">
              <div className="bg-destructive-muted text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            </div>
          )}

          {!isLoading && !error && emails.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <svg
                className="h-12 w-12 text-foreground-muted mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 9v.906a2.25 2.25 0 0 1-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 0 0 1.183 1.981l6.478 3.488m8.839 2.51-4.66-2.51m0 0-1.023-.55a2.25 2.25 0 0 0-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V8.844a2.25 2.25 0 0 1 1.183-1.981l7.5-4.039a2.25 2.25 0 0 1 2.134 0l7.5 4.039a2.25 2.25 0 0 1 1.183 1.98V19.5Z"
                />
              </svg>
              <p className="text-foreground-muted">No emails found</p>
              <p className="text-sm text-foreground-muted mt-1">
                Try adjusting your filters or search query
              </p>
            </div>
          )}

          {!isLoading && !error && emails.length > 0 && (
            <>
              <div className="divide-y divide-border-muted">
                {emails.map((email) => (
                  <div key={email.id} data-email-id={email.id}>
                    <EmailListItem
                      email={email}
                      isSelected={selectedEmailIds.has(email.id)}
                      isActive={selectedEmailId === email.id}
                      onSelect={() => handleEmailSelect(email.id)}
                      onOpen={() => handleEmailOpen(email.id)}
                      onToggleSelect={(e) => handleToggleSelect(email.id, e)}
                    />
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="secondary"
                    onClick={() => fetchEmails(true)}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Email detail panel */}
      <EmailDetail />
    </div>
  );
}
