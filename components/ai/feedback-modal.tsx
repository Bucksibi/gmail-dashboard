"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
  onClose: () => void;
  onSubmit: (issue: string) => void;
  isSubmitting: boolean;
  responseType: string;
}

const SUMMARY_ISSUES = [
  "Inaccurate summary",
  "Missing key points",
  "Wrong sentiment",
  "Too brief",
  "Too verbose",
];

const ISSUE_OPTIONS: Record<string, string[]> = {
  summary: SUMMARY_ISSUES,
  summarize: SUMMARY_ISSUES,
  chat: [
    "Incorrect information",
    "Didn't understand my question",
    "Unhelpful response",
    "Incomplete answer",
  ],
  categorize: [
    "Wrong category",
    "Wrong priority",
    "Missing context",
  ],
  tasks: [
    "Missed important tasks",
    "Incorrect deadlines",
    "Wrong priorities",
    "Irrelevant tasks included",
  ],
  filters: [
    "Irrelevant suggestions",
    "Missing useful filters",
    "Wrong counts",
  ],
};

export function FeedbackModal({
  onClose,
  onSubmit,
  isSubmitting,
  responseType,
}: FeedbackModalProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState("");

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    const issue = selectedIssue
      ? `${selectedIssue}${additionalDetails ? `: ${additionalDetails}` : ""}`
      : additionalDetails || "No specific issue provided";
    onSubmit(issue);
  };

  const issues = ISSUE_OPTIONS[responseType] || ISSUE_OPTIONS.chat;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div
          className={cn(
            "bg-surface rounded-xl shadow-2xl w-full max-w-md",
            "border border-border",
            "animate-scaleIn"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                What was wrong with this response?
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <svg
                  className="h-5 w-5 text-foreground-muted"
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
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Issue options */}
            <div className="space-y-2">
              {issues.map((issue) => (
                <label
                  key={issue}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                    "border border-border",
                    "hover:bg-surface-hover transition-colors",
                    selectedIssue === issue && "border-primary bg-primary-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name="issue"
                    value={issue}
                    checked={selectedIssue === issue}
                    onChange={() => setSelectedIssue(issue)}
                    className="h-4 w-4 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">{issue}</span>
                </label>
              ))}
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer",
                  "border border-border",
                  "hover:bg-surface-hover transition-colors",
                  selectedIssue === "other" && "border-primary bg-primary-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="issue"
                  value="other"
                  checked={selectedIssue === "other"}
                  onChange={() => setSelectedIssue("other")}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">Other</span>
              </label>
            </div>

            {/* Additional details */}
            <div>
              <label className="block text-sm text-foreground-muted mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Tell us more about what went wrong..."
                rows={3}
                className={cn(
                  "w-full px-3 py-2 rounded-lg",
                  "bg-background-secondary border border-border",
                  "text-sm text-foreground placeholder:text-foreground-muted",
                  "focus:outline-none focus:border-primary focus:bg-surface",
                  "resize-none transition-colors"
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "bg-background-secondary text-foreground",
                "hover:bg-background-tertiary transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium",
                "bg-primary text-primary-foreground",
                "hover:bg-primary-hover transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center gap-2"
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
