"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { SenderAvatar } from "./sender-avatar";
import { Button, EmailDetailSkeleton } from "@/components/ui";
import { useUIStore, useEmailStore } from "@/lib/stores";
import { cn, extractName, extractEmail } from "@/lib/utils";
import { FeedbackButtons } from "@/components/ai/feedback-buttons";

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

interface EmailSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "urgent";
  isSaved?: boolean; // Indicates if loaded from database
}

export function EmailDetail() {
  const { detailPanelOpen, closeDetailPanel } = useUIStore();
  const { selectedEmailId, emails, markAsRead } = useEmailStore();
  const [emailData, setEmailData] = useState<EmailDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Summary state
  const [summary, setSummary] = useState<EmailSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  // Load saved summary from database
  const loadSavedSummary = useCallback(async (emailId: string) => {
    try {
      const response = await fetch(`/api/summaries/${emailId}`);
      const data = await response.json();

      if (response.ok && data.summary) {
        setSummary({ ...data.summary, isSaved: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Save summary to database
  const saveSummary = useCallback(async (emailId: string, summaryData: EmailSummary) => {
    try {
      await fetch(`/api/summaries/${emailId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summaryData),
      });
    } catch (err) {
      console.error("Failed to save summary:", err);
    }
  }, []);

  // Summarize email with AI
  const handleSummarize = useCallback(async () => {
    if (!emailData) return;

    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "summarize",
          emails: [{
            id: emailData.id,
            from: emailData.from,
            subject: emailData.subject,
            snippet: emailData.body.substring(0, 500),
            body: emailData.body,
            date: emailData.date,
          }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to summarize email");
      }

      // Result is an array, get the first (and only) summary
      if (data.result && data.result.length > 0) {
        const newSummary = data.result[0];
        setSummary({ ...newSummary, isSaved: true });
        // Save to database
        await saveSummary(emailData.id, newSummary);
      }
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Failed to summarize");
    } finally {
      setSummaryLoading(false);
    }
  }, [emailData, saveSummary]);

  useEffect(() => {
    if (!selectedEmailId || !detailPanelOpen) {
      setEmailData(null);
      setSummary(null);
      setSummaryError(null);
      return;
    }

    // Clear previous summary when switching emails
    setSummary(null);
    setSummaryError(null);

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

        // Try to load saved summary
        await loadSavedSummary(selectedEmailId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchEmailDetail();
  }, [selectedEmailId, detailPanelOpen, markAsRead, loadSavedSummary]);

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
            <Button
              variant="ghost"
              size="sm"
              title="Summarize with AI"
              onClick={handleSummarize}
              disabled={!emailData || summaryLoading}
              className="text-primary hover:text-primary-hover"
            >
              {summaryLoading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              )}
              <span className="ml-1 text-xs">Summarize</span>
            </Button>
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

              {/* AI Summary */}
              {summaryError && (
                <div className="mb-6 p-4 bg-destructive-muted rounded-xl border border-destructive/20">
                  <p className="text-sm text-destructive">{summaryError}</p>
                </div>
              )}

              {summaryLoading && (
                <div className="mb-6 p-4 bg-primary-muted rounded-xl border border-primary/20 animate-pulse">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing email with AI...</span>
                  </div>
                </div>
              )}

              {summary && !summaryLoading && (
                <div className="mb-6 p-4 bg-primary-muted/50 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                    <span className="text-sm font-medium text-primary">AI Summary</span>
                    {summary.isSaved && (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Saved
                      </span>
                    )}
                    <span className={cn(
                      "ml-auto text-xs px-2 py-0.5 rounded-full font-medium",
                      summary.sentiment === "urgent" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      summary.sentiment === "negative" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                      summary.sentiment === "positive" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      summary.sentiment === "neutral" && "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                    )}>
                      {summary.sentiment}
                    </span>
                  </div>

                  <p className="text-sm text-foreground mb-3">{summary.summary}</p>

                  {summary.keyPoints.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-1.5">Key Points</h4>
                      <ul className="space-y-1">
                        {summary.keyPoints.map((point, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-foreground-muted uppercase tracking-wider mb-1.5">Action Items</h4>
                      <ul className="space-y-1">
                        {summary.actionItems.map((item, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-warning mt-0.5">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-between">
                    <FeedbackButtons
                      responseType="summary"
                      responseData={summary}
                      context={emailData?.id}
                    />
                    <button
                      onClick={() => setSummary(null)}
                      className="text-xs text-foreground-muted hover:text-foreground transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Body */}
              {emailData.isHtml ? (
                <div className="bg-zinc-50 dark:bg-zinc-700 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-500">
                  <div
                    className="email-body max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(emailData.body) }}
                  />
                </div>
              ) : (
                <EmailThreadView body={emailData.body} />
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

// HTML sanitization - removes dangerous elements and problematic inline styles
function sanitizeHtml(html: string): string {
  return html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    // Remove javascript: links
    .replace(/javascript:/gi, "")
    // Remove style tags entirely (they can override our CSS)
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    // Strip background-color from inline styles
    .replace(/background(-color)?\s*:\s*[^;}"']+[;]?/gi, "")
    // Strip color from inline styles (our CSS will handle it)
    .replace(/(?<!border-)color\s*:\s*[^;}"']+[;]?/gi, "")
    // Remove bgcolor attributes
    .replace(/\s*bgcolor\s*=\s*["'][^"']*["']/gi, "")
    // Remove font color attributes
    .replace(/(<font[^>]*)\s+color\s*=\s*["'][^"']*["']/gi, "$1");
}

// Parse email thread into separate messages
interface ThreadMessage {
  sender?: string;
  date?: string;
  content: string;
  isQuoted?: boolean;
}

function parseEmailThread(body: string): ThreadMessage[] {
  const messages: ThreadMessage[] = [];

  // Split by common reply patterns
  const patterns = [
    /^-{3,}\s*(?:Original Message|Forwarded message)\s*-{3,}/gim,
    /^On .+(?:wrote|said):\s*$/gim,
    /^From:\s*.+$/gim,
  ];

  // Try to detect if this is a thread
  let hasThread = false;
  for (const pattern of patterns) {
    if (pattern.test(body)) {
      hasThread = true;
      break;
    }
  }

  if (!hasThread) {
    // Single message, no thread
    return [{ content: body }];
  }

  // Split by "On ... wrote:" or "From:" patterns
  const threadPattern = /((?:^|\n)(?:On .+(?:wrote|said):|-{3,}\s*(?:Original Message|Forwarded message)\s*-{3,}|From:\s*.+?\n(?:Sent|Date|To|Subject):.+?(?:\n|$)))/gi;

  const parts = body.split(threadPattern).filter(Boolean);

  if (parts.length <= 1) {
    return [{ content: body }];
  }

  let currentContent = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();

    // Check if this is a header/separator
    const isHeader = /^On .+(?:wrote|said):|^-{3,}|^From:\s*.+/i.test(part);

    if (isHeader) {
      // Save previous content as a message
      if (currentContent.trim()) {
        messages.push({ content: currentContent.trim() });
      }

      // Extract sender/date from header
      const onMatch = part.match(/^On (.+?),?\s+(.+?)\s+(?:wrote|said):/i);
      const fromMatch = part.match(/^From:\s*(.+?)(?:\n|$)/i);

      currentContent = "";

      if (onMatch) {
        messages.push({
          sender: onMatch[2]?.trim(),
          date: onMatch[1]?.trim(),
          content: "",
          isQuoted: true,
        });
      } else if (fromMatch) {
        messages.push({
          sender: fromMatch[1]?.trim(),
          content: "",
          isQuoted: true,
        });
      }
    } else {
      // This is content
      if (messages.length > 0 && messages[messages.length - 1].content === "") {
        messages[messages.length - 1].content = part;
      } else {
        currentContent += (currentContent ? "\n" : "") + part;
      }
    }
  }

  // Add any remaining content
  if (currentContent.trim()) {
    messages.push({ content: currentContent.trim() });
  }

  // Filter out empty messages and reverse so newest is first
  return messages.filter(m => m.content.trim()).reverse();
}

function EmailThreadView({ body }: { body: string }) {
  const messages = parseEmailThread(body);

  if (messages.length === 1 && !messages[0].isQuoted) {
    // Single message, render simply with better typography
    return (
      <div className="space-y-4">
        <div className="bg-zinc-50 dark:bg-zinc-700 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-500">
          <div
            className="text-[15px] leading-[1.75] text-zinc-800 dark:text-zinc-50 font-[system-ui,-apple-system,sans-serif]"
            style={{ fontFeatureSettings: "'kern' 1, 'liga' 1" }}
          >
            {formatEmailContent(messages[0].content)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            "rounded-2xl p-6 border",
            message.isQuoted
              ? "bg-zinc-100 dark:bg-zinc-600 border-zinc-200 dark:border-zinc-500 ml-4"
              : "bg-zinc-50 dark:bg-zinc-700 border-zinc-200 dark:border-zinc-500"
          )}
        >
          {/* Message header */}
          {(message.sender || message.date) && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-300 dark:border-zinc-500">
              <div className="h-9 w-9 rounded-full bg-blue-500/20 dark:bg-blue-400/20 flex items-center justify-center text-sm font-semibold text-blue-600 dark:text-blue-300">
                {message.sender ? getInitialsFromSender(message.sender) : "?"}
              </div>
              <div className="flex-1 min-w-0">
                {message.sender && (
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                    {cleanSenderName(message.sender)}
                  </div>
                )}
                {message.date && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-300 mt-0.5">
                    {message.date}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message content */}
          <div
            className={cn(
              "text-[15px] leading-[1.75] font-[system-ui,-apple-system,sans-serif]",
              message.isQuoted
                ? "text-zinc-700 dark:text-zinc-200"
                : "text-zinc-800 dark:text-zinc-50"
            )}
            style={{ fontFeatureSettings: "'kern' 1, 'liga' 1" }}
          >
            {formatEmailContent(message.content)}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatEmailContent(content: string): React.ReactNode {
  // Split into paragraphs and format
  const lines = content.split(/\n/);
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      elements.push(
        <p key={elements.length} className="mb-3 last:mb-0">
          {currentParagraph.join("\n")}
        </p>
      );
      currentParagraph = [];
    }
  };

  for (const line of lines) {
    // Detect signature blocks
    if (/^--\s*$/.test(line) || /^_{3,}$/.test(line) || /^-{3,}$/.test(line)) {
      flushParagraph();
      elements.push(
        <div key={elements.length} className="my-4 border-t border-border-muted" />
      );
      continue;
    }

    // Detect quoted lines (starting with >)
    if (/^>\s*/.test(line)) {
      flushParagraph();
      elements.push(
        <blockquote
          key={elements.length}
          className="pl-3 border-l-2 border-primary/30 text-foreground-muted italic mb-3"
        >
          {line.replace(/^>\s*/, "")}
        </blockquote>
      );
      continue;
    }

    // Blank line = new paragraph
    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    currentParagraph.push(line);
  }

  flushParagraph();

  return elements;
}

function getInitialsFromSender(sender: string): string {
  // Extract name from email format like "Name <email>" or just "Name"
  const nameMatch = sender.match(/^([^<]+)/);
  const name = nameMatch ? nameMatch[1].trim() : sender;

  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function cleanSenderName(sender: string): string {
  // Remove email part and clean up
  return sender
    .replace(/<[^>]+>/g, "")
    .replace(/"/g, "")
    .trim();
}
