"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAIStore, useEmailStore, type ViewingContext } from "@/lib/stores";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { FeedbackButtons } from "./feedback-buttons";

/**
 * Formats markdown text into React components with proper styling
 * Handles: headers (###), bold (**text**), bullet points (*, -), and basic formatting
 *
 * Color scheme for dark mode legibility:
 * - Regular text: bright white (text-foreground) for maximum readability
 * - Bold/emphasis: light blue accent (text-sky-400) for visual pop
 * - Headers: light blue accent (text-sky-400) with size hierarchy
 * - Bullets: primary accent color
 */
function formatMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines (but add spacing)
    if (!trimmedLine) {
      elements.push(<div key={`space-${key++}`} className="h-3" />);
      continue;
    }

    // Headers (### Heading) - Light blue accent with size hierarchy
    const headerMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      elements.push(
        <h3
          key={`header-${key++}`}
          className={cn(
            "font-semibold text-sky-400",
            level === 1 && "text-base mt-3 mb-2",
            level === 2 && "text-sm mt-2.5 mb-1.5",
            level === 3 && "text-sm mt-2 mb-1"
          )}
        >
          {parseInlineFormatting(content)}
        </h3>
      );
      continue;
    }

    // Bullet points (* item or - item) - White text with accent bullet
    const bulletMatch = trimmedLine.match(/^[*-]\s+(.+)$/);
    if (bulletMatch) {
      const content = bulletMatch[1];
      elements.push(
        <div key={`bullet-${key++}`} className="flex items-start gap-2.5 my-1 pl-1">
          <span className="text-sky-400 mt-[3px] shrink-0 text-xs">●</span>
          <span className="text-foreground/95 flex-1 leading-relaxed">
            {parseInlineFormatting(content)}
          </span>
        </div>
      );
      continue;
    }

    // Regular paragraphs - Bright white for maximum legibility
    elements.push(
      <p key={`para-${key++}`} className="text-foreground/95 leading-relaxed my-1.5">
        {parseInlineFormatting(trimmedLine)}
      </p>
    );
  }

  return elements;
}

/**
 * Parses inline formatting like bold (**text**) within a line
 * Bold text gets light blue accent color for visual emphasis
 */
function parseInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;
  let currentIndex = 0;

  // Match bold text (**text** or __text__)
  const boldRegex = /(\*\*|__)(.*?)\1/g;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }

    // Add bold text - Light blue accent for emphasis
    parts.push(
      <strong key={`bold-${key++}`} className="font-semibold text-sky-400">
        {match[2]}
      </strong>
    );

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return parts.length > 0 ? parts : text;
}

// Context-aware suggested prompts
const PROMPTS_BY_CONTEXT = {
  selection: [
    "Summarize these emails",
    "Compare these messages",
    "What action items are here?",
    "Draft a reply to these",
  ],
  filter: [
    "Summarize filtered results",
    "What patterns do you see?",
    "Prioritize these emails",
    "Any urgent items here?",
  ],
  default: [
    "What needs my attention?",
    "Summarize unread emails",
    "Find emails about meetings",
    "Which emails are urgent?",
  ],
};

// Build human-readable filter description
function buildFilterDescription(filters: import("@/lib/stores").EmailFilters): string {
  const parts: string[] = [];

  if (filters.search) {
    parts.push(`"${filters.search}"`);
  }
  if (filters.unreadOnly) {
    parts.push("unread");
  }
  if (filters.hasAttachment) {
    parts.push("with attachments");
  }
  if (filters.dateRange !== "all") {
    const rangeLabels = { today: "today", week: "past week", month: "past month" };
    parts.push(rangeLabels[filters.dateRange]);
  }
  if (filters.categories.length > 0) {
    parts.push(filters.categories.join(", "));
  }
  if (filters.priorities.length > 0) {
    parts.push(`${filters.priorities.join("/")} priority`);
  }
  if (filters.excludeRedundant) {
    parts.push("non-redundant");
  }

  return parts.length > 0 ? parts.join(", ") + " emails" : "Filtered emails";
}

export function AIAssistantPanel() {
  const {
    isPanelOpen,
    closePanel,
    activeTab,
    setActiveTab,
    messages,
    isTyping,
    addMessage,
    setTyping,
    summaries,
    categories,
    tasks,
    suggestedFilters,
    insights,
    isAnalyzing,
    analyzeError,
    setSummaries,
    setCategories,
    setTasks,
    setFilters,
    setInsights,
    setAnalyzing,
    setAnalyzeError,
  } = useAIStore();

  const { emails, selectedEmailIds, filters, updateFilter, getFilteredEmails } = useEmailStore();
  const { viewingContext, setViewingContext } = useAIStore();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (isPanelOpen && activeTab === "chat") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isPanelOpen, activeTab]);

  // Determine viewing context based on selection and filters
  const getContextualEmails = useCallback((): {
    emails: typeof emails;
    context: ViewingContext;
  } => {
    // Priority 1: Explicit selection
    if (selectedEmailIds.size > 0) {
      const selectedEmails = emails.filter((e) => selectedEmailIds.has(e.id));
      return {
        emails: selectedEmails,
        context: {
          type: "selection",
          description: `${selectedEmailIds.size} selected email${selectedEmailIds.size !== 1 ? "s" : ""}`,
          emailIds: Array.from(selectedEmailIds),
        },
      };
    }

    // Priority 2: Active filters
    const hasFilters =
      filters.search ||
      filters.unreadOnly ||
      filters.hasAttachment ||
      filters.dateRange !== "all" ||
      filters.categories.length > 0 ||
      filters.priorities.length > 0 ||
      filters.tags.length > 0 ||
      filters.excludeRedundant;

    if (hasFilters) {
      const filteredEmails = getFilteredEmails();
      const emailsToAnalyze = filteredEmails.slice(0, 50);
      return {
        emails: emailsToAnalyze,
        context: {
          type: "filter",
          description: buildFilterDescription(filters),
          emailIds: emailsToAnalyze.map((e) => e.id),
          filters,
        },
      };
    }

    // Default: Recent inbox
    const recentEmails = emails.slice(0, 10);
    return {
      emails: recentEmails,
      context: {
        type: "default",
        description: "Recent inbox",
        emailIds: recentEmails.map((e) => e.id),
      },
    };
  }, [emails, selectedEmailIds, filters, getFilteredEmails]);

  // Update viewing context when selection/filters change
  useEffect(() => {
    const { context } = getContextualEmails();
    setViewingContext(context);
  }, [getContextualEmails, setViewingContext]);

  // Get current suggested prompts based on context
  const suggestedPrompts = useMemo(() => {
    return PROMPTS_BY_CONTEXT[viewingContext.type];
  }, [viewingContext.type]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    addMessage({ role: "user", content: userMessage });
    setTyping(true);

    try {
      const { emails: contextEmails, context } = getContextualEmails();
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          message: userMessage,
          emails: contextEmails.map((e) => ({
            id: e.id,
            from: e.from,
            subject: e.subject,
            snippet: e.snippet,
            date: e.date,
          })),
          context: {
            type: context.type,
            description: context.description,
          },
          history: messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      addMessage({ role: "assistant", content: data.response || data.error });
    } catch (error) {
      addMessage({
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      });
    } finally {
      setTyping(false);
    }
  };

  const handleQuickAction = async (
    action: "summarize" | "categorize" | "tasks" | "filters"
  ) => {
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const { emails: contextEmails } = getContextualEmails();
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          emails: contextEmails.map((e) => ({
            id: e.id,
            from: e.from,
            subject: e.subject,
            snippet: e.snippet,
            date: e.date,
          })),
        }),
      });

      const data = await response.json();

      if (data.error) {
        setAnalyzeError(data.error);
        return;
      }

      switch (action) {
        case "summarize":
          setSummaries(data.result);
          break;
        case "categorize":
          setCategories(data.result);
          break;
        case "tasks":
          setTasks(data.result.tasks || []);
          break;
        case "filters":
          setFilters(data.result.suggestedFilters || []);
          setInsights(data.result.insights || []);
          break;
      }
    } catch (error) {
      setAnalyzeError("Failed to analyze emails. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyFilter = (query: string) => {
    updateFilter("search", query);
    closePanel();
  };

  if (!isPanelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-14 bottom-0 z-50",
          "w-full max-w-md",
          "bg-surface/95 backdrop-blur-xl",
          "border-l border-border",
          "flex flex-col",
          "shadow-2xl",
          "animate-slideInRight"
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-sm">
                  AI Assistant
                </h2>
                <p className="text-xs text-foreground-muted">Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={closePanel}
              className="h-8 w-8 rounded-lg hover:bg-surface-hover flex items-center justify-center transition-colors"
            >
              <XIcon className="h-4 w-4 text-foreground-muted" />
            </button>
          </div>

          {/* Context indicator */}
          <ContextIndicator context={viewingContext} />

          {/* Tabs */}
          <div className="flex px-4 gap-1">
            <TabButton
              active={activeTab === "chat"}
              onClick={() => setActiveTab("chat")}
            >
              <ChatIcon className="h-4 w-4" />
              Chat
            </TabButton>
            <TabButton
              active={activeTab === "actions"}
              onClick={() => setActiveTab("actions")}
            >
              <BoltIcon className="h-4 w-4" />
              Quick Actions
            </TabButton>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "chat" ? (
            <ChatTab
              messages={messages}
              isTyping={isTyping}
              inputValue={inputValue}
              setInputValue={setInputValue}
              onSend={handleSendMessage}
              onPromptClick={(prompt) => {
                setInputValue(prompt);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              inputRef={inputRef}
              messagesEndRef={messagesEndRef}
              suggestedPrompts={suggestedPrompts}
            />
          ) : (
            <ActionsTab
              isAnalyzing={isAnalyzing}
              error={analyzeError}
              summaries={summaries}
              categories={categories}
              tasks={tasks}
              suggestedFilters={suggestedFilters}
              insights={insights}
              onAction={handleQuickAction}
              onApplyFilter={handleApplyFilter}
              context={viewingContext}
            />
          )}
        </div>
      </div>
    </>
  );
}

// Chat Tab Component
function ChatTab({
  messages,
  isTyping,
  inputValue,
  setInputValue,
  onSend,
  onPromptClick,
  inputRef,
  messagesEndRef,
  suggestedPrompts,
}: {
  messages: { id: string; role: "user" | "assistant"; content: string }[];
  isTyping: boolean;
  inputValue: string;
  setInputValue: (v: string) => void;
  onSend: () => void;
  onPromptClick: (prompt: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  suggestedPrompts: string[];
}) {
  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center mb-4">
              <SparklesIcon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-medium text-foreground mb-2">
              How can I help you?
            </h3>
            <p className="text-sm text-foreground-muted mb-6">
              Ask me anything about your emails
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onPromptClick(prompt)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs",
                    "bg-background-secondary hover:bg-background-tertiary",
                    "text-foreground-muted hover:text-foreground",
                    "border border-border",
                    "transition-all duration-200"
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <MessageBubble
                key={message.id}
                message={message}
                style={{ animationDelay: `${idx * 50}ms` }}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 p-4 border-t border-border bg-surface">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Ask about your emails..."
            className={cn(
              "flex-1 h-10 px-4 rounded-xl",
              "bg-background-secondary border border-transparent",
              "text-sm text-foreground placeholder:text-foreground-muted",
              "focus:outline-none focus:border-primary focus:bg-surface",
              "transition-all duration-200"
            )}
          />
          <Button
            onClick={onSend}
            disabled={!inputValue.trim()}
            className="h-10 w-10 p-0 rounded-xl"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

// Actions Tab Component
function ActionsTab({
  isAnalyzing,
  error,
  summaries,
  categories,
  tasks,
  suggestedFilters,
  insights,
  onAction,
  onApplyFilter,
  context,
}: {
  isAnalyzing: boolean;
  error: string | null;
  summaries: Map<string, any>;
  categories: Map<string, any>;
  tasks: any[];
  suggestedFilters: { label: string; query: string; count: number }[];
  insights: string[];
  onAction: (action: "summarize" | "categorize" | "tasks" | "filters") => void;
  onApplyFilter: (query: string) => void;
  context: ViewingContext;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Context indicator - removed duplicate since we have header indicator */}

      {error && (
        <div className="p-3 rounded-lg bg-destructive-muted text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-3">
        <ActionCard
          icon={<DocumentIcon className="h-5 w-5" />}
          title="Summarize"
          description="Get key points"
          onClick={() => onAction("summarize")}
          loading={isAnalyzing}
          hasResults={summaries.size > 0}
        />
        <ActionCard
          icon={<TagIcon className="h-5 w-5" />}
          title="Categorize"
          description="Auto-organize"
          onClick={() => onAction("categorize")}
          loading={isAnalyzing}
          hasResults={categories.size > 0}
        />
        <ActionCard
          icon={<ChecklistIcon className="h-5 w-5" />}
          title="Extract Tasks"
          description="Find action items"
          onClick={() => onAction("tasks")}
          loading={isAnalyzing}
          hasResults={tasks.length > 0}
        />
        <ActionCard
          icon={<FilterIcon className="h-5 w-5" />}
          title="Smart Filters"
          description="Get suggestions"
          onClick={() => onAction("filters")}
          loading={isAnalyzing}
          hasResults={suggestedFilters.length > 0}
        />
      </div>

      {/* Results Sections */}
      {summaries.size > 0 && (
        <ResultsSection title="Summaries">
          <div className="space-y-3">
            {Array.from(summaries.values()).map((summary: any) => (
              <SummaryCard key={summary.id} summary={summary} />
            ))}
          </div>
        </ResultsSection>
      )}

      {categories.size > 0 && (
        <ResultsSection
          title="Categories"
          responseType="categorize"
          responseData={Array.from(categories.values())}
        >
          <div className="flex flex-wrap gap-2">
            {Array.from(categories.values()).map((cat: any) => (
              <CategoryBadge key={cat.id} category={cat} />
            ))}
          </div>
        </ResultsSection>
      )}

      {tasks.length > 0 && (
        <ResultsSection
          title="Tasks Found"
          responseType="tasks"
          responseData={tasks}
        >
          <div className="space-y-2">
            {tasks.map((task, idx) => (
              <TaskItem key={idx} task={task} />
            ))}
          </div>
        </ResultsSection>
      )}

      {suggestedFilters.length > 0 && (
        <ResultsSection
          title="Suggested Filters"
          responseType="filters"
          responseData={{ suggestedFilters, insights }}
        >
          <div className="flex flex-wrap gap-2">
            {suggestedFilters.map((filter, idx) => (
              <button
                key={idx}
                onClick={() => onApplyFilter(filter.query)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs",
                  "bg-primary-muted text-primary",
                  "hover:bg-primary hover:text-primary-foreground",
                  "transition-colors duration-200"
                )}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className="ml-1 opacity-70">({filter.count})</span>
                )}
              </button>
            ))}
          </div>
        </ResultsSection>
      )}

      {insights.length > 0 && (
        <ResultsSection title="Insights">
          <ul className="space-y-2 text-sm text-foreground-muted">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </ResultsSection>
      )}
    </div>
  );
}

// Sub-components
function ContextIndicator({ context }: { context: ViewingContext }) {
  const contextIcons = {
    selection: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    filter: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
      </svg>
    ),
    default: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
      </svg>
    ),
  };

  const contextColors = {
    selection: "bg-primary-muted text-primary border-primary/30",
    filter: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    default: "bg-background-secondary text-foreground-muted border-border",
  };

  return (
    <div className="px-4 py-2">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs border",
          contextColors[context.type]
        )}
      >
        {contextIcons[context.type]}
        <span className="font-medium">Analyzing:</span>
        <span className="truncate">{context.description}</span>
        {context.type !== "default" && (
          <span className="ml-auto shrink-0 opacity-70">
            {context.emailIds.length} email{context.emailIds.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2 text-sm font-medium",
        "border-b-2 -mb-px transition-colors duration-200",
        active
          ? "text-foreground border-primary"
          : "text-foreground-muted border-transparent hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function MessageBubble({
  message,
  style,
}: {
  message: { id: string; role: "user" | "assistant"; content: string };
  style?: React.CSSProperties;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex animate-fadeIn",
        isUser ? "justify-end" : "justify-start"
      )}
      style={style}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl text-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md px-4 py-2.5"
            : "bg-background-secondary text-foreground rounded-bl-md"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="px-4 py-3">
            {/* Formatted markdown content */}
            <div className="space-y-1">
              {formatMarkdown(message.content)}
            </div>

            {/* Feedback buttons */}
            <div className="mt-3 pt-3 border-t border-border-muted">
              <FeedbackButtons
                responseType="chat"
                responseData={{ content: message.content }}
                context={message.id}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-foreground-muted animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <span className="text-xs text-foreground-muted ml-2">AI is thinking...</span>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
  loading,
  hasResults,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  hasResults: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "p-4 rounded-xl text-left",
        "bg-background-secondary hover:bg-background-tertiary",
        "border border-border",
        "transition-all duration-200",
        "group",
        loading && "opacity-50 cursor-wait"
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-lg mb-3 flex items-center justify-center",
          "bg-surface text-foreground-muted group-hover:text-primary",
          "transition-colors duration-200",
          hasResults && "bg-primary-muted text-primary"
        )}
      >
        {loading ? (
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          icon
        )}
      </div>
      <h4 className="font-medium text-foreground text-sm">{title}</h4>
      <p className="text-xs text-foreground-muted">{description}</p>
      {hasResults && (
        <span className="text-xs text-primary mt-1 block">Results ready</span>
      )}
    </button>
  );
}

function ResultsSection({
  title,
  children,
  responseType,
  responseData,
}: {
  title: string;
  children: React.ReactNode;
  responseType?: "categorize" | "tasks" | "filters";
  responseData?: any;
}) {
  return (
    <div className="border border-border rounded-xl p-4 animate-fadeIn">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground text-sm">{title}</h4>
        {responseType && responseData && (
          <FeedbackButtons
            responseType={responseType}
            responseData={responseData}
          />
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryCard({ summary }: { summary: any }) {
  const sentimentColors = {
    positive: "bg-success-muted text-success",
    neutral: "bg-background-tertiary text-foreground-muted",
    negative: "bg-warning-muted text-warning",
    urgent: "bg-destructive-muted text-destructive",
  };

  return (
    <div className="p-3 bg-surface rounded-lg border border-border-muted">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-foreground">{summary.summary}</p>
        <span
          className={cn(
            "shrink-0 px-2 py-0.5 rounded-full text-xs",
            sentimentColors[summary.sentiment as keyof typeof sentimentColors]
          )}
        >
          {summary.sentiment}
        </span>
      </div>
      {summary.keyPoints?.length > 0 && (
        <ul className="text-xs text-foreground-muted space-y-1 mb-2">
          {summary.keyPoints.map((point: string, i: number) => (
            <li key={i}>• {point}</li>
          ))}
        </ul>
      )}
      {summary.actionItems?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {summary.actionItems.map((item: string, i: number) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-primary-muted text-primary text-xs rounded"
            >
              {item}
            </span>
          ))}
        </div>
      )}
      <div className="pt-2 border-t border-border-muted">
        <FeedbackButtons
          responseType="summarize"
          responseData={summary}
          context={summary.id}
        />
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: any }) {
  const priorityColors = {
    high: "border-destructive text-destructive",
    medium: "border-warning text-warning",
    low: "border-foreground-muted text-foreground-muted",
  };

  return (
    <div
      className={cn(
        "px-3 py-1.5 rounded-lg border text-xs",
        priorityColors[category.priority as keyof typeof priorityColors]
      )}
    >
      <span className="font-medium">{category.category}</span>
      <span className="mx-1 opacity-50">•</span>
      <span>{category.priority}</span>
    </div>
  );
}

function TaskItem({ task }: { task: any }) {
  const [checked, setChecked] = useState(false);

  const priorityColors = {
    high: "text-destructive",
    medium: "text-warning",
    low: "text-foreground-muted",
  };

  return (
    <label className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => setChecked(!checked)}
        className="mt-0.5 h-4 w-4 rounded border-border"
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm text-foreground",
            checked && "line-through opacity-50"
          )}
        >
          {task.task}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-foreground-muted">{task.source}</span>
          {task.deadline && (
            <span className="text-xs text-primary">{task.deadline}</span>
          )}
          <span
            className={cn(
              "text-xs",
              priorityColors[task.priority as keyof typeof priorityColors]
            )}
          >
            {task.priority}
          </span>
        </div>
      </div>
    </label>
  );
}

// Icons
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  );
}

function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
    </svg>
  );
}

// AI Trigger Button for Header
export function AITriggerButton({ className }: { className?: string }) {
  const { togglePanel, isPanelOpen } = useAIStore();

  return (
    <button
      onClick={togglePanel}
      className={cn(
        "flex h-9 items-center gap-2 px-3 rounded-lg",
        "text-foreground-muted hover:text-foreground",
        "hover:bg-surface-hover transition-all duration-200",
        "focus-ring",
        isPanelOpen && "bg-primary-muted text-primary",
        className
      )}
      aria-label="Toggle AI Assistant"
    >
      <SparklesIcon className="h-4 w-4" />
      <span className="text-sm hidden sm:inline">AI</span>
    </button>
  );
}
