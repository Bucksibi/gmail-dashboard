"use client";

import { format, isToday, isYesterday } from "date-fns";
import { SenderAvatar } from "./sender-avatar";
import { DotBadge } from "@/components/ui";
import { cn, extractName, decodeHtmlEntities } from "@/lib/utils";
import type { Email, EmailClassification } from "@/lib/stores";
import { ClassificationBadge } from "./classification-badge";

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  isActive: boolean;
  classification?: EmailClassification;
  onSelect: () => void;
  onOpen: () => void;
  onToggleSelect: (e: React.MouseEvent) => void;
}

export function EmailListItem({
  email,
  isSelected,
  isActive,
  classification,
  onSelect,
  onOpen,
  onToggleSelect,
}: EmailListItemProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return format(date, "h:mm a");
      }
      if (isYesterday(date)) {
        return "Yesterday";
      }
      return format(date, "MMM d");
    } catch {
      return dateStr;
    }
  };

  const senderName = extractName(email.from);
  const isUnread = email.isUnread;

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
        if (e.key === " ") {
          e.preventDefault();
          onToggleSelect(e as unknown as React.MouseEvent);
        }
      }}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 cursor-pointer",
        "border-b border-border-muted last:border-b-0",
        "transition-colors duration-150",
        "focus:outline-none focus:z-10",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",

        // Selection states
        isActive && "bg-email-selected ring-2 ring-primary/50 ring-inset",
        !isActive && "hover:bg-email-hover",
        isSelected && !isActive && "bg-primary-muted/50"
      )}
    >
      {/* Selection checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(e);
        }}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded border shrink-0",
          "transition-colors duration-150",
          isSelected
            ? "bg-primary border-primary text-white"
            : "border-border hover:border-border-focus"
        )}
      >
        {isSelected && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </div>

      {/* Avatar */}
      <SenderAvatar from={email.from} size="sm" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 min-w-0">
            {isUnread && <DotBadge className="shrink-0" />}
            <span
              className={cn(
                "truncate",
                isUnread ? "font-semibold text-foreground" : "text-foreground"
              )}
            >
              {senderName}
            </span>
          </div>
          <span className="text-xs text-foreground-muted shrink-0">
            {formatDate(email.date)}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-0.5">
          <div
            className={cn(
              "text-sm truncate",
              isUnread ? "font-medium text-foreground" : "text-foreground",
              classification?.isRedundant && "opacity-60"
            )}
          >
            {decodeHtmlEntities(email.subject) || "(no subject)"}
          </div>
          {classification && (
            <ClassificationBadge classification={classification} compact />
          )}
        </div>

        <div
          className={cn(
            "text-sm text-foreground-muted truncate",
            classification?.isRedundant && "opacity-50"
          )}
        >
          {decodeHtmlEntities(email.snippet)}
        </div>
      </div>

      {/* Attachment indicator */}
      {email.hasAttachment && (
        <svg
          className="h-4 w-4 text-foreground-muted shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
          />
        </svg>
      )}
    </div>
  );
}
