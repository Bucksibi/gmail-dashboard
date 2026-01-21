"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { SenderAvatar } from "./sender-avatar";
import { Button, EmailDetailSkeleton } from "@/components/ui";
import { useUIStore, useEmailStore } from "@/lib/stores";
import { cn, extractName, extractEmail } from "@/lib/utils";

interface EmailDetailData {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  isHtml: boolean;
}

export function EmailDetail() {
  const { detailPanelOpen, closeDetailPanel } = useUIStore();
  const { selectedEmailId, emails, markAsRead } = useEmailStore();
  const [emailData, setEmailData] = useState<EmailDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  useEffect(() => {
    if (!selectedEmailId || !detailPanelOpen) {
      setEmailData(null);
      return;
    }

    const fetchEmailDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/gmail/messages/${selectedEmailId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch email");
        }

        setEmailData(data);
        markAsRead([selectedEmailId]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEmailDetail();
  }, [selectedEmailId, detailPanelOpen, markAsRead]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailPanelOpen) {
        closeDetailPanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailPanelOpen, closeDetailPanel]);

  if (!detailPanelOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden animate-fadeIn"
        onClick={closeDetailPanel}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-14 bottom-0 z-50 w-full max-w-xl",
          "bg-surface border-l border-border shadow-xl",
          "flex flex-col",
          "animate-slideInRight",
          "lg:relative lg:top-0 lg:z-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <Button variant="ghost" size="sm" onClick={closeDetailPanel}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" title="Archive">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </Button>
            <Button variant="ghost" size="sm" title="Delete">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && <EmailDetailSkeleton />}

          {error && (
            <div className="p-6">
              <div className="bg-destructive-muted text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            </div>
          )}

          {!loading && !error && emailData && (
            <div className="p-6">
              {/* Subject */}
              <h1 className="text-xl font-semibold text-foreground mb-6">
                {emailData.subject || "(no subject)"}
              </h1>

              {/* Sender info */}
              <div className="flex items-start gap-3 mb-6 pb-6 border-b border-border">
                <SenderAvatar from={emailData.from} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-foreground truncate">
                      {extractName(emailData.from)}
                    </span>
                    <span className="text-sm text-foreground-muted shrink-0">
                      {formatDetailDate(emailData.date)}
                    </span>
                  </div>
                  <div className="text-sm text-foreground-muted truncate">
                    {extractEmail(emailData.from)}
                  </div>
                  <div className="text-sm text-foreground-muted mt-1">
                    <span className="text-foreground-muted">To: </span>
                    {emailData.to}
                  </div>
                </div>
              </div>

              {/* Body */}
              {emailData.isHtml ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(emailData.body) }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                  {emailData.body}
                </div>
              )}
            </div>
          )}

          {!loading && !error && !emailData && selectedEmail && (
            <div className="p-6 text-center text-foreground-muted">
              Select an email to view its contents
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function formatDetailDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

// Basic HTML sanitization - in production use DOMPurify
function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}
