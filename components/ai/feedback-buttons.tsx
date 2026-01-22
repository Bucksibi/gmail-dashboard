"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FeedbackModal } from "./feedback-modal";

interface FeedbackButtonsProps {
  responseType: "summary" | "summarize" | "chat" | "categorize" | "tasks" | "filters";
  responseData: any;
  context?: string;
  className?: string;
}

export function FeedbackButtons({
  responseType,
  responseData,
  context,
  className,
}: FeedbackButtonsProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const submitFeedback = async (
    selectedRating: "up" | "down",
    issue?: string
  ) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseType,
          responseData,
          context,
          rating: selectedRating,
          issue,
        }),
      });

      if (response.ok) {
        setRating(selectedRating);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
      setShowModal(false);
    }
  };

  const handleThumbsUp = () => {
    if (rating || isSubmitting) return;
    submitFeedback("up");
  };

  const handleThumbsDown = () => {
    if (rating || isSubmitting) return;
    setShowModal(true);
  };

  const handleModalSubmit = (issue: string) => {
    submitFeedback("down", issue);
  };

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        {showSuccess ? (
          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 animate-fadeIn">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
            Thanks for feedback
          </span>
        ) : (
          <>
            <button
              onClick={handleThumbsUp}
              disabled={rating !== null || isSubmitting}
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                "hover:bg-green-100 dark:hover:bg-green-900/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                rating === "up" && "bg-green-100 dark:bg-green-900/30"
              )}
              title="This was helpful"
            >
              {isSubmitting && rating === null ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ThumbsUpIcon
                  className={cn(
                    "h-4 w-4",
                    rating === "up"
                      ? "text-green-600 dark:text-green-400"
                      : "text-foreground-muted hover:text-green-600 dark:hover:text-green-400"
                  )}
                  filled={rating === "up"}
                />
              )}
            </button>
            <button
              onClick={handleThumbsDown}
              disabled={rating !== null || isSubmitting}
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                "hover:bg-red-100 dark:hover:bg-red-900/30",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                rating === "down" && "bg-red-100 dark:bg-red-900/30"
              )}
              title="This wasn't helpful"
            >
              <ThumbsDownIcon
                className={cn(
                  "h-4 w-4",
                  rating === "down"
                    ? "text-red-600 dark:text-red-400"
                    : "text-foreground-muted hover:text-red-600 dark:hover:text-red-400"
                )}
                filled={rating === "down"}
              />
            </button>
          </>
        )}
      </div>

      {showModal && (
        <FeedbackModal
          onClose={() => setShowModal(false)}
          onSubmit={handleModalSubmit}
          isSubmitting={isSubmitting}
          responseType={responseType}
        />
      )}
    </>
  );
}

function ThumbsUpIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m7.594-9.052a4.5 4.5 0 0 0-1.423-.23H5.904M14.5 9h3.126m-10.348 9.75H5.25A2.25 2.25 0 0 1 3 16.5v-2.25a2.25 2.25 0 0 1 2.25-2.25h1.028"
      />
    </svg>
  );
}

function ThumbsDownIcon({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      className={className}
      fill={filled ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 0 1 2.25 12c0-2.848.992-5.464 2.649-7.521.388-.482.987-.729 1.605-.729H10.52c.483 0 .964.078 1.423.23l3.114 1.04a4.501 4.501 0 0 0 1.423.23h1.294c.806 0 1.533.446 2.031 1.08a9.041 9.041 0 0 1 2.861 2.4c.723.384 1.35.956 1.653 1.715.212.505.322 1.061.322 1.672v.633a.75.75 0 0 1-.75.75 2.25 2.25 0 0 1-2.25-2.25c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282H4.372m14.126 9.052H5.25m14.126 0a4.5 4.5 0 0 1-1.423.23H14.52m4.878-.23a2.25 2.25 0 0 1-2.25 2.25v2.25a2.25 2.25 0 0 1-2.25 2.25h-1.028"
      />
    </svg>
  );
}
