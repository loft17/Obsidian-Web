import { create } from 'zustand';

interface TreeItem {
  type: 'folder' | 'file' | 'other';
  path: string;
  name: string;
}

interface Tab {
  path: string;
  name: string;
  isDirty: boolean;
}

interface AppStore {
  tree: TreeItem[];
  setTree: (tree: TreeItem[]) => void;
  tabs: Tab[];
  addTab: (path: string, name: string) => void;
  openFile: (path: string, name: string) => void;
  renameTab: (oldPath: string, newPath: string) => void;
  removeTab: (path: string) => void;
  activeTab: string | null;
  setActiveTab: (path: string | null) => void;
  setTabDirty: (path: string, isDirty: boolean) => void;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  defaultEditMode: boolean;
  setDefaultEditMode: (mode: boolean) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  collapseAll: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

// true si `path` es `base` o está dentro de la carpeta `base`
export const isUnder = (path: string, base: string) => path === base || path.startsWith(base + '/');

const DEFAULT_MODE_KEY = 'defaultNoteMode';
const initialDefaultEditMode = (() => {
  try {
    return localStorage.getItem(DEFAULT_MODE_KEY) !== 'view';
  } catch {
    return true;
  }
})();

export const useStore =create<AppStore>((set) => ({
  tree: [],
  setTree: (tree) => set({ tree }),
  tabs: [],
  addTab: (path, name) =>
    set((state) => {
      if (state.tabs.find((t) => t.path === path)) return state;
      return { tabs: [...state.tabs, { path, name, isDirty: false }] };
    }),
  openFile: (path, name) =>
    set((state) => {
      // Ya abierto en alguna pestaña: solo activarla
      if (state.tabs.find((t) => t.path === path)) return { activeTab: path };
      const tab = { path, name, isDirty: false };
      const idx = state.tabs.findIndex((t) => t.path === state.activeTab);
      const editMode = state.defaultEditMode;
      // Sin pestaña activa: crear una; si no, reemplazar la activa
      if (idx < 0) return { tabs: [...state.tabs, tab], activeTab: path, editMode };
      const tabs = [...state.tabs];
      tabs[idx] = tab;
      return { tabs, activeTab: path, editMode };
    }),
  // Si la ruta es una carpeta, afecta también a todo lo que contiene
  renameTab: (oldPath, newPath) =>
    set((state) => {
      const move = (p: string) => (isUnder(p, oldPath) ? newPath + p.substring(oldPath.length) : p);
      return {
        tabs: state.tabs.map((t) => {
          if (!isUnder(t.path, oldPath)) return t;
          const path = move(t.path);
          return { ...t, path, name: path.split('/').pop() || path };
        }),
        activeTab: state.activeTab && move(state.activeTab),
        expandedFolders: new Set([...state.expandedFolders].map(move)),
      };
    }),
  removeTab: (path) =>
    set((state) => ({
      tabs: state.tabs.filter((t) => !isUnder(t.path, path)),
      activeTab: state.activeTab && isUnder(state.activeTab, path) ? null : state.activeTab,
    })),
  activeTab: null,
  setActiveTab: (path) => set({ activeTab: path }),
  setTabDirty: (path, isDirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.path === path ? { ...t, isDirty } : t)),
    })),
  editMode: initialDefaultEditMode,
  setEditMode: (mode) => set({ editMode: mode }),
  defaultEditMode: initialDefaultEditMode,
  setDefaultEditMode: (mode) => {
    try {
      localStorage.setItem(DEFAULT_MODE_KEY, mode ? 'edit' : 'view');
    } catch {
      // almacenamiento no disponible: la preferencia solo dura la sesión
    }
    set({ defaultEditMode: mode });
  },
  expandedFolders: new Set(),
  collapseAll: () => set({ expandedFolders: new Set() }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleFolder: (path) =>
    set((state) => {
      const expanded = new Set(state.expandedFolders);
      if (expanded.has(path)) {
        expanded.delete(path);
      } else {
        expanded.add(path);
      }
      return { expandedFolders: expanded };
    }),
}));
