import { create } from "zustand";

export interface Email {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  isUnread?: boolean;
  hasAttachment?: boolean;
  labelIds?: string[];
}

export interface EmailFilters {
  search: string;
  unreadOnly: boolean;
  hasAttachment: boolean;
  dateRange: "all" | "today" | "week" | "month";
}

interface EmailState {
  // Data
  emails: Email[];
  selectedEmailId: string | null;
  selectedEmailIds: Set<string>;

  // Pagination
  pageToken: string | null;
  hasMore: boolean;

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Filters
  filters: EmailFilters;

  // Actions
  setEmails: (emails: Email[]) => void;
  appendEmails: (emails: Email[], pageToken: string | null) => void;
  selectEmail: (id: string | null) => void;
  toggleEmailSelection: (id: string) => void;
  selectAllEmails: () => void;
  clearSelection: () => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPageToken: (token: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  updateFilter: <K extends keyof EmailFilters>(
    key: K,
    value: EmailFilters[K]
  ) => void;
  resetFilters: () => void;
  markAsRead: (ids: string[]) => void;
  markAsUnread: (ids: string[]) => void;
}

const defaultFilters: EmailFilters = {
  search: "",
  unreadOnly: false,
  hasAttachment: false,
  dateRange: "all",
};

export const useEmailStore = create<EmailState>((set, get) => ({
  // Initial state
  emails: [],
  selectedEmailId: null,
  selectedEmailIds: new Set(),
  pageToken: null,
  hasMore: false,
  isLoading: true,
  isLoadingMore: false,
  error: null,
  filters: defaultFilters,

  // Actions
  setEmails: (emails) =>
    set({
      emails,
      selectedEmailId: null,
      selectedEmailIds: new Set(),
    }),

  appendEmails: (newEmails, pageToken) =>
    set((state) => ({
      emails: [...state.emails, ...newEmails],
      pageToken,
      hasMore: !!pageToken,
    })),

  selectEmail: (id) => set({ selectedEmailId: id }),

  toggleEmailSelection: (id) =>
    set((state) => {
      const newSelection = new Set(state.selectedEmailIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selectedEmailIds: newSelection };
    }),

  selectAllEmails: () =>
    set((state) => ({
      selectedEmailIds: new Set(state.emails.map((e) => e.id)),
    })),

  clearSelection: () => set({ selectedEmailIds: new Set() }),

  setLoading: (isLoading) => set({ isLoading }),

  setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),

  setError: (error) => set({ error }),

  setPageToken: (pageToken) => set({ pageToken, hasMore: !!pageToken }),

  setHasMore: (hasMore) => set({ hasMore }),

  updateFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () =>
    set({
      filters: defaultFilters,
      pageToken: null,
    }),

  markAsRead: (ids) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        ids.includes(email.id) ? { ...email, isUnread: false } : email
      ),
    })),

  markAsUnread: (ids) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        ids.includes(email.id) ? { ...email, isUnread: true } : email
      ),
    })),
}));
