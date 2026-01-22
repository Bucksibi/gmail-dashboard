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

export interface EmailClassification {
  id: string;
  emailId: string;
  userId: string;
  category: string;
  priority: "high" | "medium" | "low";
  isRedundant: boolean;
  redundantOf?: string | null;
  aiReason?: string | null;
  confidence?: number | null;
  isManual: boolean;
}

export interface UserTag {
  id: string;
  userId: string;
  name: string;
  color: string;
}

export interface EmailFilters {
  search: string;
  unreadOnly: boolean;
  hasAttachment: boolean;
  dateRange: "all" | "today" | "week" | "month";
  // New classification filters
  categories: string[];
  priorities: ("high" | "medium" | "low")[];
  tags: string[];
  excludeRedundant: boolean;
}

interface EmailState {
  // Data
  emails: Email[];
  selectedEmailId: string | null;
  selectedEmailIds: Set<string>;

  // Classifications
  classifications: Map<string, EmailClassification>;
  userTags: UserTag[];
  emailTags: Map<string, string[]>; // emailId -> tagIds
  isClassifying: boolean;

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

  // Classification actions
  setClassifications: (classifications: Record<string, EmailClassification>) => void;
  setUserTags: (tags: UserTag[]) => void;
  setEmailTags: (emailId: string, tagIds: string[]) => void;
  setClassifying: (classifying: boolean) => void;
  getFilteredEmails: () => Email[];
}

const defaultFilters: EmailFilters = {
  search: "",
  unreadOnly: false,
  hasAttachment: false,
  dateRange: "all",
  categories: [],
  priorities: [],
  tags: [],
  excludeRedundant: false,
};

export const useEmailStore = create<EmailState>((set, get) => ({
  // Initial state
  emails: [],
  selectedEmailId: null,
  selectedEmailIds: new Set(),
  classifications: new Map(),
  userTags: [],
  emailTags: new Map(),
  isClassifying: false,
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

  // Classification actions
  setClassifications: (newClassifications) =>
    set((state) => {
      // Merge new classifications with existing ones instead of replacing
      const merged = new Map(state.classifications);
      for (const [emailId, classification] of Object.entries(newClassifications)) {
        merged.set(emailId, classification);
      }
      return { classifications: merged };
    }),

  setUserTags: (tags) => set({ userTags: tags }),

  setEmailTags: (emailId, tagIds) =>
    set((state) => {
      const newEmailTags = new Map(state.emailTags);
      newEmailTags.set(emailId, tagIds);
      return { emailTags: newEmailTags };
    }),

  setClassifying: (isClassifying) => set({ isClassifying }),

  getFilteredEmails: () => {
    const { emails, filters, classifications, emailTags } = get();

    return emails.filter((email) => {
      // Category filter
      if (filters.categories.length > 0) {
        const classification = classifications.get(email.id);
        if (!classification || !filters.categories.includes(classification.category)) {
          return false;
        }
      }

      // Priority filter
      if (filters.priorities.length > 0) {
        const classification = classifications.get(email.id);
        if (!classification || !filters.priorities.includes(classification.priority)) {
          return false;
        }
      }

      // Exclude redundant
      if (filters.excludeRedundant) {
        const classification = classifications.get(email.id);
        if (classification?.isRedundant) {
          return false;
        }
      }

      // Tag filter
      if (filters.tags.length > 0) {
        const tags = emailTags.get(email.id) || [];
        if (!filters.tags.some((tagId) => tags.includes(tagId))) {
          return false;
        }
      }

      return true;
    });
  },
}));
