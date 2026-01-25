import { create } from 'zustand'

interface EditorState {
    isSidebarOpen: boolean
    isRightPanelOpen: boolean
    activeRightPanelTab: 'character' | 'world' | 'ai' | 'stats'
    focusMode: boolean
    toggleSidebar: () => void
    toggleRightPanel: () => void
    setRightPanelTab: (tab: 'character' | 'world' | 'ai' | 'stats') => void
    setFocusMode: (enabled: boolean) => void
}

export const useEditorStore = create<EditorState>((set) => ({
    isSidebarOpen: true,
    isRightPanelOpen: true,
    activeRightPanelTab: 'character',
    focusMode: false,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
    setRightPanelTab: (tab) => set({ activeRightPanelTab: tab, isRightPanelOpen: true }),
    setFocusMode: (enabled) => set({
        focusMode: enabled,
        // Automatically hide panels in focus mode
        isSidebarOpen: !enabled,
        isRightPanelOpen: !enabled
    }),
}))
