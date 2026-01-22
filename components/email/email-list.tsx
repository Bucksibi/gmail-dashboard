"use client";

import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { EmailListItem } from "./email-list-item";
import { EmailFilters } from "./email-filters";
import { EmailDetail } from "./email-detail";
import { EmailListSkeleton, Button } from "@/components/ui";
import { useEmailStore, useUIStore, type EmailFilters as Filters } from "@/lib/stores";
import { cn } from "@/lib/utils";
import type { EmailForAI } from "@/lib/gemini";

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
    classifications,
    isClassifying,
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
    setClassifications,
    setClassifying,
    getFilteredEmails,
  } = useEmailStore();

  const { detailPanelOpen, openDetailPanel, closeDetailPanel, toggleSidebar } = useUIStore();
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndexRef = useRef<number>(-1);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Force update mechanism for keyboard navigation
  // Zustand updates happen outside React's event system when using window.addEventListener,
  // so we need to trigger a React re-render manually after store updates
  const [, forceRender] = useState(0);

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

  // Auto-classify unclassified emails
  // Track classified email IDs to avoid re-triggering on classifications change
  const classifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const classifyEmails = async () => {
      // Only classify if we have emails and aren't already classifying
      if (emails.length === 0 || isClassifying || isLoading) return;

      // Find unclassified emails (not in store AND not already sent for classification)
      const unclassified = emails.filter(
        (e) => !classifications.has(e.id) && !classifiedIdsRef.current.has(e.id)
      );
      if (unclassified.length === 0) return;

      // Classify in batches of 50
      const batch = unclassified.slice(0, 50);

      // Mark as pending classification to prevent re-triggering
      batch.forEach((e) => classifiedIdsRef.current.add(e.id));
      setClassifying(true);

      try {
        const emailsForAI: EmailForAI[] = batch.map((e) => ({
          id: e.id,
          from: e.from,
          subject: e.subject,
          snippet: e.snippet,
          date: e.date,
        }));

        const response = await fetch("/api/classifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emails: emailsForAI,
            existingEmailIds: emails.map((e) => e.id),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setClassifications(data.classifications);
        } else {
          // On error, remove from pending so they can be retried
          batch.forEach((e) => classifiedIdsRef.current.delete(e.id));
        }
      } catch (error) {
        console.error("Failed to classify emails:", error);
        // On error, remove from pending so they can be retried
        batch.forEach((e) => classifiedIdsRef.current.delete(e.id));
      } finally {
        setClassifying(false);
      }
    };

    // Debounce classification
    const timer = setTimeout(classifyEmails, 1000);
    return () => clearTimeout(timer);
  }, [emails, classifications, isClassifying, isLoading, setClassifications, setClassifying]);

  // Memoize displayed emails - used for both render and keyboard navigation
  const displayEmails = useMemo(() => {
    const hasClassificationFilters =
      filters.categories.length > 0 ||
      filters.priorities.length > 0 ||
      filters.excludeRedundant;

    return hasClassificationFilters ? getFilteredEmails() : emails;
  }, [emails, filters.categories, filters.priorities, filters.excludeRedundant, getFilteredEmails]);

  // Keyboard navigation
  // Note: We use useEmailStore.getState() inside the handler to avoid stale closure issues.
  // This ensures we always get the latest store state and actions.
  // We also use forceRender to trigger React re-renders after Zustand updates,
  // since window.addEventListener events are outside React's event system.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Get fresh state from store to avoid stale closures
      const store = useEmailStore.getState();
      const uiStore = useUIStore.getState();
      const currentSelectedId = store.selectedEmailId;

      // Use displayEmails (filtered list) for navigation so keyboard matches what's visible
      const currentIndex = displayEmails.findIndex((email) => email.id === currentSelectedId);

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          if (currentIndex < displayEmails.length - 1) {
            const nextId = displayEmails[currentIndex + 1].id;
            store.selectEmail(nextId);
            selectedIndexRef.current = currentIndex + 1;
            forceRender((n) => n + 1);
          } else if (currentIndex === -1 && displayEmails.length > 0) {
            const firstId = displayEmails[0].id;
            store.selectEmail(firstId);
            selectedIndexRef.current = 0;
            forceRender((n) => n + 1);
          }
          break;

        case "k":
        case "ArrowUp":
          e.preventDefault();
          if (currentIndex > 0) {
            store.selectEmail(displayEmails[currentIndex - 1].id);
            selectedIndexRef.current = currentIndex - 1;
            forceRender((n) => n + 1);
          }
          break;

        case "Enter":
        case "o":
          if (currentSelectedId) {
            uiStore.openDetailPanel();
            forceRender((n) => n + 1);
          }
          break;

        case "Escape":
          if (uiStore.detailPanelOpen) {
            uiStore.closeDetailPanel();
          } else if (store.selectedEmailIds.size > 0) {
            store.clearSelection();
          } else {
            store.selectEmail(null);
          }
          forceRender((n) => n + 1);
          break;

        case "x":
          if (currentSelectedId) {
            store.toggleEmailSelection(currentSelectedId);
            forceRender((n) => n + 1);
          }
          break;

        case "a":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            store.selectAllEmails();
            forceRender((n) => n + 1);
          }
          break;

        case "r":
          if (!e.metaKey && !e.ctrlKey) {
            fetchEmails();
          }
          break;

        case "[":
          uiStore.toggleSidebar();
          forceRender((n) => n + 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [displayEmails, fetchEmails]);

  // Scroll selected email into view
  useEffect(() => {
    if (selectedEmailId && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-email-id="${selectedEmailId}"]`
      );
      selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedEmailId]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchEmails(true);
        }
      },
      {
        root: listRef.current,
        rootMargin: "200px", // Start loading 200px before reaching the bottom
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, fetchEmails]);

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
                {/* Render filtered/displayed emails */}
                {displayEmails.map((email) => (
                  <div key={email.id} data-email-id={email.id}>
                    <EmailListItem
                      email={email}
                      isSelected={selectedEmailIds.has(email.id)}
                      isActive={selectedEmailId === email.id}
                      classification={classifications.get(email.id)}
                      onSelect={() => handleEmailSelect(email.id)}
                      onOpen={() => handleEmailOpen(email.id)}
                      onToggleSelect={(e) => handleToggleSelect(email.id, e)}
                    />
                  </div>
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div
                  ref={loadMoreRef}
                  className="flex items-center justify-center py-6"
                >
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-sm text-foreground-muted">
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Loading more emails...</span>
                    </div>
                  )}
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
