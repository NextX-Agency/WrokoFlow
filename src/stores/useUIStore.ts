import { create } from "zustand"

type ViewType = "board" | "list" | "calendar" | "timeline" | "training" | "attendance" | "dashboard"

interface UIState {
  activeProjectId: string | null
  selectedView: ViewType
  openTaskId: string | null
  selectedTaskIds: string[]
  sidebarOpen: boolean
  activeListFilter: string | null

  setActiveProjectId: (id: string | null) => void
  setSelectedView: (view: ViewType) => void
  setOpenTaskId: (id: string | null) => void
  toggleTaskSelection: (id: string) => void
  toggleTaskId: (id: string) => void
  setSelectedTaskIds: (ids: string[]) => void
  clearSelectedTasks: () => void
  clearSelection: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setActiveListFilter: (id: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeProjectId: null,
  selectedView: "board",
  openTaskId: null,
  selectedTaskIds: [],
  sidebarOpen: true,
  activeListFilter: null,

  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setSelectedView: (view) => set({ selectedView: view }),
  setOpenTaskId: (id) => set({ openTaskId: id }),
  toggleTaskSelection: (id) =>
    set((state) => ({
      selectedTaskIds: state.selectedTaskIds.includes(id)
        ? state.selectedTaskIds.filter((tid) => tid !== id)
        : [...state.selectedTaskIds, id],
    })),
  toggleTaskId: (id) =>
    set((state) => ({
      selectedTaskIds: state.selectedTaskIds.includes(id)
        ? state.selectedTaskIds.filter((tid) => tid !== id)
        : [...state.selectedTaskIds, id],
    })),
  setSelectedTaskIds: (ids) => set({ selectedTaskIds: ids }),
  clearSelectedTasks: () => set({ selectedTaskIds: [] }),
  clearSelection: () => set({ selectedTaskIds: [] }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveListFilter: (id) => set({ activeListFilter: id }),
}))
