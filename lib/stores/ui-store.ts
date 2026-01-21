import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Widget = "email" | "calendar" | "tasks" | "notes";

interface UIState {
  // Sidebar
  sidebarExpanded: boolean;
  activeWidget: Widget;

  // Email detail panel
  detailPanelOpen: boolean;

  // Keyboard shortcuts help
  shortcutsModalOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setActiveWidget: (widget: Widget) => void;
  openDetailPanel: () => void;
  closeDetailPanel: () => void;
  toggleDetailPanel: () => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarExpanded: true,
      activeWidget: "email",
      detailPanelOpen: false,
      shortcutsModalOpen: false,

      // Actions
      toggleSidebar: () =>
        set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),

      setSidebarExpanded: (sidebarExpanded) => set({ sidebarExpanded }),

      setActiveWidget: (activeWidget) => set({ activeWidget }),

      openDetailPanel: () => set({ detailPanelOpen: true }),

      closeDetailPanel: () => set({ detailPanelOpen: false }),

      toggleDetailPanel: () =>
        set((state) => ({ detailPanelOpen: !state.detailPanelOpen })),

      openShortcutsModal: () => set({ shortcutsModalOpen: true }),

      closeShortcutsModal: () => set({ shortcutsModalOpen: false }),
    }),
    {
      name: "dashboard-ui-state",
      partialize: (state) => ({
        sidebarExpanded: state.sidebarExpanded,
        activeWidget: state.activeWidget,
      }),
    }
  )
);
