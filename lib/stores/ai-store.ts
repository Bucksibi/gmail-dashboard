import { create } from "zustand";
import type { EmailForAI } from "@/lib/gemini";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface EmailSummary {
  id: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "urgent";
}

export interface EmailCategory {
  id: string;
  category: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

export interface Task {
  task: string;
  source: string;
  deadline?: string;
  priority: "high" | "medium" | "low";
}

interface AIState {
  // Panel state
  isPanelOpen: boolean;
  activeTab: "chat" | "actions";

  // Chat
  messages: ChatMessage[];
  isTyping: boolean;

  // Analysis results
  summaries: Map<string, EmailSummary>;
  categories: Map<string, EmailCategory>;
  tasks: Task[];
  suggestedFilters: { label: string; query: string; count: number }[];
  insights: string[];

  // Loading states
  isAnalyzing: boolean;
  analyzeError: string | null;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveTab: (tab: "chat" | "actions") => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  setTyping: (typing: boolean) => void;
  clearChat: () => void;
  setSummaries: (summaries: EmailSummary[]) => void;
  setCategories: (categories: EmailCategory[]) => void;
  setTasks: (tasks: Task[]) => void;
  setFilters: (filters: { label: string; query: string; count: number }[]) => void;
  setInsights: (insights: string[]) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setAnalyzeError: (error: string | null) => void;
  clearResults: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  // Initial state
  isPanelOpen: false,
  activeTab: "chat",
  messages: [],
  isTyping: false,
  summaries: new Map(),
  categories: new Map(),
  tasks: [],
  suggestedFilters: [],
  insights: [],
  isAnalyzing: false,
  analyzeError: null,

  // Actions
  openPanel: () => set({ isPanelOpen: true }),
  closePanel: () => set({ isPanelOpen: false }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setActiveTab: (activeTab) => set({ activeTab }),

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),

  setTyping: (isTyping) => set({ isTyping }),
  clearChat: () => set({ messages: [] }),

  setSummaries: (summaries) =>
    set({
      summaries: new Map(summaries.map((s) => [s.id, s])),
    }),

  setCategories: (categories) =>
    set({
      categories: new Map(categories.map((c) => [c.id, c])),
    }),

  setTasks: (tasks) => set({ tasks }),
  setFilters: (suggestedFilters) => set({ suggestedFilters }),
  setInsights: (insights) => set({ insights }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalyzeError: (analyzeError) => set({ analyzeError }),

  clearResults: () =>
    set({
      summaries: new Map(),
      categories: new Map(),
      tasks: [],
      suggestedFilters: [],
      insights: [],
    }),
}));
